from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Transaction(models.Model):
    """Payment transaction records"""
    
    TRANSACTION_TYPE_CHOICES = [
        ('booking_payment', 'Booking Payment'),
        ('deposit', 'Deposit'),
        ('refund', 'Refund'),
        ('payout', 'Payout to Host'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='transactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    
    razorpay_payment_id = models.CharField(max_length=100, blank=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True)
    razorpay_signature = models.CharField(max_length=255, blank=True)
    
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Transaction #{self.id} - {self.transaction_type} - {self.amount}"
