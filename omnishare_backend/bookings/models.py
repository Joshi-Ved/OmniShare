from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.conf import settings
from django.utils import timezone
import qrcode
from io import BytesIO
from django.core.files import File
from PIL import Image as PILImage

User = get_user_model()


class Booking(models.Model):
    """
    Main booking model with state machine and commission tracking
    """
    
    BOOKING_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('in_use', 'In-Use'),
        ('returned', 'Returned'),
        ('disputed', 'Disputed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    ESCROW_STATUS_CHOICES = [
        ('not_created', 'Not Created'),
        ('held', 'Held'),
        ('released_to_host', 'Released to Host'),
        ('refunded_to_guest', 'Refunded to Guest'),
    ]
    
    # Relationships
    listing = models.ForeignKey('listings.Listing', on_delete=models.CASCADE, related_name='bookings')
    guest = models.ForeignKey(User, on_delete=models.CASCADE, related_name='guest_bookings')
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='host_bookings')
    
    # Booking Dates
    start_date = models.DateField()
    end_date = models.DateField()
    rental_days = models.IntegerField()
    
    # Financial Details
    daily_price = models.DecimalField(max_digits=10, decimal_places=2)
    rental_amount = models.DecimalField(max_digits=10, decimal_places=2)  # daily_price * rental_days
    commission_host = models.DecimalField(max_digits=10, decimal_places=2)  # 12% of rental_amount
    commission_guest = models.DecimalField(max_digits=10, decimal_places=2)  # 6% added to guest price
    platform_commission = models.DecimalField(max_digits=10, decimal_places=2)  # total 18%
    deposit = models.DecimalField(max_digits=10, decimal_places=2)
    insurance_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    guest_total = models.DecimalField(max_digits=10, decimal_places=2)  # What guest pays
    host_payout = models.DecimalField(max_digits=10, decimal_places=2)  # What host receives
    
    # Status Tracking
    booking_status = models.CharField(max_length=20, choices=BOOKING_STATUS_CHOICES, default='pending')
    escrow_status = models.CharField(max_length=20, choices=ESCROW_STATUS_CHOICES, default='not_created')
    
    # QR Code for Handover
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    qr_token = models.CharField(max_length=100, unique=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(blank=True, null=True)
    handover_at = models.DateTimeField(blank=True, null=True)
    return_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    cancelled_at = models.DateTimeField(blank=True, null=True)
    
    # Dispute Management
    dispute_flag = models.BooleanField(default=False)
    dispute_raised_at = models.DateTimeField(blank=True, null=True)
    dispute_raised_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='disputes_raised'
    )
    dispute_reason = models.TextField(blank=True)
    dispute_resolved_at = models.DateTimeField(blank=True, null=True)
    dispute_resolution = models.TextField(blank=True)
    
    # Cancellation
    cancellation_reason = models.TextField(blank=True)
    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings_cancelled'
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['booking_status']),
            models.Index(fields=['guest', 'booking_status']),
            models.Index(fields=['host', 'booking_status']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"Booking #{self.id} - {self.listing.title} by {self.guest.username}"
    
    def save(self, *args, **kwargs):
        # Calculate financial details before saving
        if not self.id:  # Only on creation
            self.calculate_amounts()
            self.generate_qr_code()
        super().save(*args, **kwargs)
    
    def calculate_amounts(self):
        """Calculate all financial amounts with commission"""
        from datetime import timedelta
        
        # Calculate rental days
        if not self.rental_days:
            delta = self.end_date - self.start_date
            self.rental_days = max(1, delta.days)
        
        # Base rental amount
        self.daily_price = self.listing.daily_price
        self.rental_amount = self.daily_price * self.rental_days
        self.deposit = self.listing.deposit
        
        # Commission calculations
        self.commission_host = self.rental_amount * settings.PLATFORM_COMMISSION_HOST  # 12%
        self.commission_guest = self.rental_amount * settings.PLATFORM_COMMISSION_GUEST  # 6%
        self.platform_commission = self.commission_host + self.commission_guest  # 18%
        
        # Guest pays: rental + guest commission + deposit + insurance
        self.guest_total = self.rental_amount + self.commission_guest + self.deposit + self.insurance_fee
        
        # Host receives: rental - host commission
        self.host_payout = self.rental_amount - self.commission_host
        
        # Set host from listing
        self.host = self.listing.host
    
    def generate_qr_code(self):
        """Generate unique QR code for booking verification"""
        import uuid
        
        self.qr_token = str(uuid.uuid4())
        qr_data = f"OmniShare-Booking-{self.id}-{self.qr_token}"
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save to file
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        file_name = f'booking_{self.id}_{self.qr_token[:8]}.png'
        self.qr_code.save(file_name, File(buffer), save=False)
    
    def can_confirm(self):
        """Check if booking can be confirmed"""
        return self.booking_status == 'pending'
    
    def can_handover(self):
        """Check if item can be handed over"""
        return self.booking_status == 'confirmed' and self.start_date <= timezone.now().date()
    
    def can_return(self):
        """Check if item can be returned"""
        return self.booking_status == 'in_use'
    
    def can_complete(self):
        """Check if booking can be completed"""
        return self.booking_status == 'returned' and not self.dispute_flag
    
    def can_dispute(self):
        """Check if dispute can be raised"""
        return self.booking_status in ['in_use', 'returned']
    
    def can_cancel(self):
        """Check if booking can be cancelled"""
        from datetime import timedelta
        cancellation_window = timezone.now() + timedelta(hours=settings.CANCELLATION_WINDOW_HOURS)
        return (
            self.booking_status == 'pending' or
            (self.booking_status == 'confirmed' and self.start_date > cancellation_window.date())
        )
    
    def confirm_booking(self):
        """Transition to confirmed state"""
        if not self.can_confirm():
            raise ValueError("Booking cannot be confirmed in current state")
        
        self.booking_status = 'confirmed'
        self.confirmed_at = timezone.now()
        self.escrow_status = 'held'
        self.save()
        
        # Update listing stats
        self.listing.total_bookings += 1
        self.listing.save()
        
        # Update user stats
        self.guest.total_bookings += 1
        self.guest.save()
    
    def mark_handover(self):
        """Mark item as handed over"""
        if not self.can_handover():
            raise ValueError("Item cannot be handed over in current state")
        
        self.booking_status = 'in_use'
        self.handover_at = timezone.now()
        self.save()
    
    def mark_return(self):
        """Mark item as returned"""
        if not self.can_return():
            raise ValueError("Item cannot be returned in current state")
        
        self.booking_status = 'returned'
        self.return_at = timezone.now()
        self.save()
    
    def complete_booking(self):
        """Complete booking and release funds"""
        if not self.can_complete():
            raise ValueError("Booking cannot be completed in current state")
        
        self.booking_status = 'completed'
        self.completed_at = timezone.now()
        self.escrow_status = 'released_to_host'
        self.save()
        
        # Update user stats
        self.guest.successful_bookings += 1
        self.guest.update_trust_score()
        self.guest.save()
        
        self.host.successful_bookings += 1
        self.host.update_trust_score()
        self.host.check_gold_host_eligibility()
        self.host.save()
    
    def raise_dispute(self, raised_by, reason):
        """Raise a dispute"""
        if not self.can_dispute():
            raise ValueError("Dispute cannot be raised in current state")
        
        self.dispute_flag = True
        self.booking_status = 'disputed'
        self.dispute_raised_by = raised_by
        self.dispute_reason = reason
        self.dispute_raised_at = timezone.now()
        self.save()
        
        # Update user stats
        self.guest.disputed_bookings += 1
        self.guest.update_trust_score()
        self.guest.save()
        
        self.host.disputed_bookings += 1
        self.host.update_trust_score()
        self.host.save()
    
    def resolve_dispute(self, resolution, refund_to_guest=False):
        """Admin resolves dispute"""
        if self.booking_status != 'disputed':
            raise ValueError("No active dispute to resolve")
        
        self.dispute_resolution = resolution
        self.dispute_resolved_at = timezone.now()
        self.booking_status = 'completed'
        self.completed_at = timezone.now()
        
        if refund_to_guest:
            self.escrow_status = 'refunded_to_guest'
        else:
            self.escrow_status = 'released_to_host'
        
        self.save()
    
    def cancel_booking(self, cancelled_by, reason):
        """Cancel booking"""
        if not self.can_cancel():
            raise ValueError("Booking cannot be cancelled in current state")
        
        self.booking_status = 'cancelled'
        self.cancelled_by = cancelled_by
        self.cancellation_reason = reason
        self.cancelled_at = timezone.now()
        self.escrow_status = 'refunded_to_guest'
        self.save()
        
        # Update user stats
        if cancelled_by == self.guest:
            self.guest.cancelled_bookings += 1
            self.guest.update_trust_score()
            self.guest.save()


class BookingDateLock(models.Model):
    """
    Temporary lock on dates during booking creation to prevent double booking
    """
    listing = models.ForeignKey('listings.Listing', on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    locked_by = models.ForeignKey(User, on_delete=models.CASCADE)
    locked_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        indexes = [
            models.Index(fields=['listing', 'start_date', 'end_date']),
        ]
    
    @classmethod
    def create_lock(cls, listing, start_date, end_date, user):
        """Create a temporary lock for 10 minutes"""
        from datetime import timedelta
        expires_at = timezone.now() + timedelta(minutes=10)
        return cls.objects.create(
            listing=listing,
            start_date=start_date,
            end_date=end_date,
            locked_by=user,
            expires_at=expires_at
        )
    
    @classmethod
    def cleanup_expired(cls):
        """Remove expired locks"""
        now = timezone.now()
        cls.objects.filter(expires_at__lt=now).delete()
