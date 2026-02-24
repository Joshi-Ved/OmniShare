"""
Enhanced Payment Module - Experiment 5
Implements:
- Razorpay Sandbox Integration
- Escrow Management
- Commission Split
- Invoice Generation
- Transaction Logging
- Settlement Module
"""

from django.db import models, transaction as db_transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
import razorpay
from django.conf import settings
from datetime import timedelta
import json

User = get_user_model()


class EscrowAccount(models.Model):
    """
    Escrow account for holding guest payments before completion
    Simulates platform's money holding mechanism
    """
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('released_to_host', 'Released to Host'),
        ('refunded_to_guest', 'Refunded to Guest'),
        ('partially_released', 'Partially Released'),
    ]
    
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='escrow')
    guest = models.ForeignKey(User, on_delete=models.PROTECT, related_name='escrow_as_guest')
    host = models.ForeignKey(User, on_delete=models.PROTECT, related_name='escrow_as_host')
    
    # Amounts
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)  # Full guest payment
    guest_commission = models.DecimalField(max_digits=10, decimal_places=2)  # 6%
    host_commission = models.DecimalField(max_digits=10, decimal_places=2)  # 12%
    rental_amount = models.DecimalField(max_digits=10, decimal_places=2)  # To host
    platform_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # 18% total
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Timings
    created_at = models.DateTimeField(auto_now_add=True)
    held_until = models.DateTimeField(blank=True, null=True)  # 1 day after return
    released_at = models.DateTimeField(blank=True, null=True)
    
    def release_to_host(self):
        """Release escrow funds to host"""
        if self.status != 'active':
            raise ValueError("Escrow must be active to release")
        
        self.status = 'released_to_host'
        self.released_at = timezone.now()
        self.save()
        
        # Create settlement transaction
        Settlement.objects.create(
            user=self.host,
            escrow=self,
            settlement_type='escrow_release',
            amount=self.rental_amount,
            status='pending'
        )
    
    def refund_to_guest(self, refund_amount=None):
        """Refund escrow funds to guest"""
        if self.status not in ['active', 'partially_released']:
            raise ValueError("Cannot refund from this escrow status")
        
        amount = refund_amount or self.total_amount
        
        if refund_amount:
            self.status = 'partially_released'
        else:
            self.status = 'refunded_to_guest'
        
        self.released_at = timezone.now()
        self.save()
        
        # Create refund transaction
        Transaction.objects.create(
            booking=self.booking,
            user=self.guest,
            transaction_type='refund',
            amount=amount,
            status='pending',
            escrow=self
        )
    
    def __str__(self):
        return f"Escrow #{self.id} - Booking {self.booking.id} - {self.status}"


class CommissionSplit(models.Model):
    """
    Tracks commission split for each booking
    Provides detailed breakdown of platform earnings
    """
    
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='commission_split')
    escrow = models.ForeignKey(EscrowAccount, on_delete=models.CASCADE, related_name='commission_splits')
    
    # Commission breakdown
    rental_amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission_host = models.DecimalField(max_digits=10, decimal_places=2)  # 12%
    commission_guest = models.DecimalField(max_digits=10, decimal_places=2)  # 6%
    total_commission = models.DecimalField(max_digits=10, decimal_places=2)  # 18%
    
    # What guest and host get
    guest_total = models.DecimalField(max_digits=10, decimal_places=2)  # What guest pays
    host_payout = models.DecimalField(max_digits=10, decimal_places=2)  # What host receives
    
    # Platform earnings
    platform_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    calculated_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Commission Split - Booking {self.booking.id} - {self.total_commission}"


class Transaction(models.Model):
    """Enhanced Transaction tracking with escrow reference"""
    
    TRANSACTION_TYPE_CHOICES = [
        ('booking_payment', 'Booking Payment'),
        ('deposit', 'Deposit'),
        ('refund', 'Refund'),
        ('payout', 'Payout to Host'),
        ('commission_debit', 'Commission Debit'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('processing', 'Processing'),
    ]
    
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='payment_transactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_transactions')
    escrow = models.ForeignKey(EscrowAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    
    razorpay_payment_id = models.CharField(max_length=100, blank=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True)
    razorpay_signature = models.CharField(max_length=255, blank=True)
    
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Additional details
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)  # Store webhook data, etc.
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['booking', 'status']),
        ]
    
    def __str__(self):
        return f"Transaction #{self.id} - {self.transaction_type} - ₹{self.amount}"


class Settlement(models.Model):
    """
    Settlement records for host payouts
    Tracks when and how much each host receives
    """
    
    SETTLEMENT_TYPE_CHOICES = [
        ('escrow_release', 'Escrow Release'),
        ('refund', 'Refund'),
        ('commission_adjustment', 'Commission Adjustment'),
    ]
    
    SETTLEMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='settlements')
    escrow = models.ForeignKey(EscrowAccount, on_delete=models.SET_NULL, null=True, blank=True)
    
    settlement_type = models.CharField(max_length=25, choices=SETTLEMENT_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=SETTLEMENT_STATUS_CHOICES, default='pending')
    
    # Razorpay transfer ID
    razorpay_transfer_id = models.CharField(max_length=100, blank=True)
    
    # Timing
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"Settlement #{self.id} - {self.user.username} - ₹{self.amount}"


class Invoice(models.Model):
    """
    Invoice records for bookings
    PDF generated for both guest and host
    """
    
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='invoice')
    guest = models.ForeignKey(User, on_delete=models.PROTECT, related_name='guest_invoices')
    host = models.ForeignKey(User, on_delete=models.PROTECT, related_name='host_invoices')
    
    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_date = models.DateField(auto_now_add=True)
    due_date = models.DateField()
    
    # Amount breakdown
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    platform_commission = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # PDF
    pdf_file = models.FileField(upload_to='invoices/', blank=True)
    pdf_generated = models.BooleanField(default=False)
    
    # Status
    sent_to_guest = models.BooleanField(default=False)
    sent_to_host = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Invoice #{self.invoice_number} - Booking {self.booking.id}"


class WebhookLog(models.Model):
    """
    Logs all webhook calls from Razorpay for debugging and compliance
    """
    
    WEBHOOK_EVENT_CHOICES = [
        ('payment.authorized', 'Payment Authorized'),
        ('payment.failed', 'Payment Failed'),
        ('payment.captured', 'Payment Captured'),
        ('refund.created', 'Refund Created'),
        ('transfer.created', 'Transfer Created'),
        ('settlement.processed', 'Settlement Processed'),
    ]
    
    event = models.CharField(max_length=50, choices=WEBHOOK_EVENT_CHOICES)
    razorpay_webhook_id = models.CharField(max_length=100)
    payload = models.JSONField()
    
    processed = models.BooleanField(default=False)
    processing_error = models.TextField(blank=True)
    
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-received_at']
    
    def __str__(self):
        return f"Webhook {self.event} - {self.received_at}"
