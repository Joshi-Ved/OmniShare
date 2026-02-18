from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils.text import slugify

User = get_user_model()


class Category(models.Model):
    """Categories for listings"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # For frontend icon class
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name


class Listing(models.Model):
    """Main listing model for rentable items"""
    
    VERIFICATION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    # Basic Info
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='listings')
    
    # Pricing
    daily_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    deposit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Security deposit amount"
    )
    
    # Location
    location = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    address = models.TextField(blank=True)
    
    # Availability
    availability_start = models.DateField()
    availability_end = models.DateField()
    is_available = models.BooleanField(default=True)
    
    # Verification & Status
    verification_status = models.CharField(
        max_length=20,
        choices=VERIFICATION_STATUS_CHOICES,
        default='pending'
    )
    verification_remarks = models.TextField(blank=True)
    verified_at = models.DateTimeField(blank=True, null=True)
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_listings'
    )
    
    # Ratings & Reviews
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MinValueValidator(5)]
    )
    total_reviews = models.IntegerField(default=0)
    total_bookings = models.IntegerField(default=0)
    
    # Premium Features
    promoted_flag = models.BooleanField(default=False)
    promoted_until = models.DateTimeField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-promoted_flag', '-created_at']
        indexes = [
            models.Index(fields=['verification_status', 'is_available']),
            models.Index(fields=['category']),
            models.Index(fields=['location']),
            models.Index(fields=['-rating']),
        ]
    
    def __str__(self):
        return f"{self.title} by {self.host.username}"
    
    def is_verified(self):
        return self.verification_status == 'approved'
    
    def is_bookable(self):
        """Check if listing can be booked"""
        return (
            self.is_available and
            self.is_verified() and
            self.host.kyc_status == 'verified'
        )
    
    def update_rating(self):
        """Recalculate average rating from reviews"""
        from django.db.models import Avg
        avg_rating = self.reviews.aggregate(Avg('rating'))['rating__avg']
        if avg_rating:
            self.rating = round(avg_rating, 2)
            self.total_reviews = self.reviews.count()
            self.save()


class ListingImage(models.Model):
    """Multiple images for a listing"""
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='listing_images/')
    caption = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-is_primary', 'uploaded_at']
    
    def __str__(self):
        return f"Image for {self.listing.title}"


class Review(models.Model):
    """Reviews and ratings for listings"""
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='reviews')
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='review')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    
    rating = models.IntegerField(validators=[MinValueValidator(1), MinValueValidator(5)])
    comment = models.TextField()
    
    # Review aspects
    cleanliness_rating = models.IntegerField(
        validators=[MinValueValidator(1), MinValueValidator(5)],
        blank=True,
        null=True
    )
    accuracy_rating = models.IntegerField(
        validators=[MinValueValidator(1), MinValueValidator(5)],
        blank=True,
        null=True
    )
    value_rating = models.IntegerField(
        validators=[MinValueValidator(1), MinValueValidator(5)],
        blank=True,
        null=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['listing', 'booking']
    
    def __str__(self):
        return f"Review by {self.reviewer.username} for {self.listing.title}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update listing rating after review
        self.listing.update_rating()
