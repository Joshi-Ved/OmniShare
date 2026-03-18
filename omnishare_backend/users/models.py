from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator


class User(AbstractUser):
    """
    Custom User model with KYC, trust score, and role management
    """
    
    ROLE_CHOICES = [
        ('guest', 'Guest'),
        ('host', 'Host'),
        ('both', 'Both'),
        ('admin', 'Admin'),
    ]
    
    KYC_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('not_submitted', 'Not Submitted'),
    ]
    
    # Basic Info
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True)
    
    # Role & Permissions
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='guest')
    
    # KYC & Verification
    kyc_status = models.CharField(max_length=20, choices=KYC_STATUS_CHOICES, default='not_submitted')
    kyc_document = models.FileField(upload_to='kyc_documents/', blank=True, null=True)
    kyc_submitted_at = models.DateTimeField(blank=True, null=True)
    kyc_verified_at = models.DateTimeField(blank=True, null=True)
    
    # Trust & Reputation
    trust_score = models.FloatField(
        default=5.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)]
    )
    total_bookings = models.IntegerField(default=0)
    successful_bookings = models.IntegerField(default=0)
    cancelled_bookings = models.IntegerField(default=0)
    disputed_bookings = models.IntegerField(default=0)
    
    # Gold Host Status
    gold_host_flag = models.BooleanField(default=False)
    gold_host_since = models.DateTimeField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_ip = models.GenericIPAddressField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['kyc_status']),
            models.Index(fields=['role']),
        ]
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    def is_host(self):
        """Check if user can act as host"""
        return self.role in ['host', 'both', 'admin']
    
    def is_guest(self):
        """Check if user can act as guest"""
        return self.role in ['guest', 'both', 'admin']
    
    def can_create_listing(self):
        """Check if user can create listings"""
        return self.is_host() and self.kyc_status == 'verified'
    
    def can_book(self):
        """Check if user can make bookings"""
        # KYC gate is relaxed for demo flow so guests can pay directly.
        return self.is_guest()
    
    def update_trust_score(self):
        """Recalculate trust score based on booking history"""
        if self.total_bookings == 0:
            self.trust_score = 5.0
        else:
            success_rate = self.successful_bookings / self.total_bookings
            dispute_penalty = self.disputed_bookings * 0.5
            self.trust_score = max(0.0, min(5.0, (success_rate * 5) - dispute_penalty))
        self.save()
    
    def check_gold_host_eligibility(self):
        """Check and update Gold Host status"""
        from django.utils import timezone
        from listings.models import Listing
        
        # Criteria: 10+ successful bookings AND 4.5+ average rating
        if self.successful_bookings >= 10:
            avg_rating = Listing.objects.filter(host=self).aggregate(
                avg=models.Avg('rating')
            )['avg'] or 0
            
            if avg_rating >= 4.5:
                if not self.gold_host_flag:
                    self.gold_host_flag = True
                    self.gold_host_since = timezone.now()
                    self.save()
                return True
        
        return False
