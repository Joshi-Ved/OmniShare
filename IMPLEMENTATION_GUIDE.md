# OmniShare - Implementation Guide

## 📦 Project Structure

```
omnishare_backend/
├── users/                 # User Management & KYC
│   ├── models.py         # Custom User, KYC, Trust Score
│   ├── views.py          # Auth, Profile, KYC endpoints
│   ├── serializers.py    # User serialization
│   └── permissions.py    # Role-based permissions
│
├── listings/             # Listing Management
│   ├── models.py         # Category, Listing, Review
│   ├── views.py          # CRUD, Admin verification
│   ├── serializers.py    # Listing serialization
│   └── services.py       # Business logic
│
├── bookings/             # Booking & State Machine
│   ├── models.py         # Booking with state transitions
│   ├── views.py          # Booking lifecycle endpoints
│   ├── serializers.py    # Booking serialization
│   └── services.py       # Price calc, QR verification
│
├── payments/             # Payment Integration
│   ├── models.py         # Transaction, Order
│   ├── views.py          # Razorpay integration
│   ├── razorpay_utils.py # Payment utilities
│   └── serializers.py    # Payment serialization
│
├── crm/                  # Admin Dashboard & Reports
│   ├── models.py         # Dashboard data
│   ├── views.py          # Admin endpoints
│   └── serializers.py    # Report serialization
│
├── marketing/            # Lead & Referral System
│   ├── models.py         # Lead, Referral
│   ├── views.py          # Lead capture, referral
│   └── serializers.py
│
└── omnishare/
    ├── settings.py       # Configuration
    ├── urls.py          # URL routing
    └── wsgi.py
```

---

## 🔐 Authentication & Authorization

### Custom User Model

**Features:**
- Role-based (guest, host, both)
- KYC verification workflow
- Trust score system (0-5)
- Gold host flag (10+ bookings, 4.5+ rating)

**Implementation in `users/models.py`:**

```python
class User(AbstractUser):
    ROLE_CHOICES = [
        ('guest', 'Guest'),
        ('host', 'Host'),
        ('both', 'Both'),
    ]
    
    KYC_CHOICES = [
        ('not_submitted', 'Not Submitted'),
        ('pending', 'Pending Verification'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]
    
    phone_number = models.CharField(max_length=20)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    kyc_status = models.CharField(max_length=20, choices=KYC_CHOICES, default='not_submitted')
    trust_score = models.DecimalField(max_digits=3, decimal_places=1, default=5.0)
    gold_host_flag = models.BooleanField(default=False)
    can_create_listing = models.BooleanField(default=False)  # Set after KYC
    
    def update_trust_score(self):
        """Auto-calculate trust score based on bookings"""
        completed = self.host_bookings.filter(booking_status='completed').count()
        all_bookings = self.host_bookings.filter(booking_status='completed')
        
        if completed > 0:
            avg_rating = all_bookings.aggregate(Avg('reviews__rating'))['reviews__rating__avg'] or 5.0
            self.trust_score = min(5.0, avg_rating)
            
            if completed >= 10 and self.trust_score >= 4.5:
                self.gold_host_flag = True
            
            self.save()
```

### JWT Authentication

**Token Configuration (`settings.py`):**

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
}
```

---

## 📦 Booking State Machine

### State Transitions

```python
class Booking(models.Model):
    BOOKING_STATUS_CHOICES = [
        ('pending', 'Pending'),           # Initial state
        ('confirmed', 'Confirmed'),       # Host accepts
        ('in_use', 'In-Use'),            # Item with guest
        ('returned', 'Returned'),        # Item returned
        ('completed', 'Completed'),      # Booking done
        ('disputed', 'Disputed'),        # Issue raised
        ('cancelled', 'Cancelled'),      # Cancelled before use
    ]
    
    booking_status = models.CharField(
        max_length=20,
        choices=BOOKING_STATUS_CHOICES,
        default='pending'
    )
```

### Valid Transitions

**Implementation in `bookings/models.py`:**

```python
def confirm_booking(self):
    """pending → confirmed"""
    if self.booking_status != 'pending':
        raise ValueError("Only pending bookings can be confirmed")
    
    self.booking_status = 'confirmed'
    self.confirmed_at = timezone.now()
    
    # Create escrow hold
    self.escrow_status = 'held'
    
    # Block dates in inventory
    self.block_inventory()
    
    self.save()

def mark_handover(self, qr_token):
    """confirmed → in_use (verify QR)"""
    if self.booking_status != 'confirmed':
        raise ValueError("Booking must be confirmed for handover")
    
    if not verify_qr_token(qr_token, self.qr_token):
        raise ValueError("Invalid QR token")
    
    self.booking_status = 'in_use'
    self.handover_at = timezone.now()
    self.save()

def mark_return(self, qr_token):
    """in_use → returned (verify QR)"""
    if self.booking_status != 'in_use':
        raise ValueError("Booking must be in-use for return")
    
    if not verify_qr_token(qr_token, self.qr_token):
        raise ValueError("Invalid QR token")
    
    self.booking_status = 'returned'
    self.return_at = timezone.now()
    self.save()

def complete_booking(self):
    """returned → completed"""
    if self.booking_status != 'returned':
        raise ValueError("Booking must be returned for completion")
    
    # Release escrow to host
    self.escrow_status = 'released_to_host'
    
    self.booking_status = 'completed'
    self.completed_at = timezone.now()
    
    # Update trust scores
    self.guest.update_trust_score()
    self.host.update_trust_score()
    
    self.save()

def raise_dispute(self, reason):
    """Any state → disputed"""
    self.booking_status = 'disputed'
    self.dispute_flag = True
    self.dispute_raised_at = timezone.now()
    self.dispute_reason = reason
    self.save()

def cancel_booking(self, reason):
    """pending → cancelled"""
    if self.booking_status not in ['pending', 'confirmed']:
        raise ValueError("Can only cancel pending or confirmed bookings")
    
    # Release inventory blocks
    self.unblock_inventory()
    
    # Refund escrow if held
    if self.escrow_status == 'held':
        self.escrow_status = 'refunded_to_guest'
    
    self.booking_status = 'cancelled'
    self.cancelled_at = timezone.now()
    self.save()
```

---

## 💰 Commission Calculation

### Commission Formula

**Implementation in `bookings/services.py`:**

```python
def calculate_booking_price(listing_id, start_date, end_date):
    """
    Rental Amount = daily_price × rental_days
    Commission Host = 12% of rental_amount
    Commission Guest = 6% added to guest price
    Platform Commission = 18% total
    
    Guest Total = rental_amount + commission_guest + deposit + insurance
    Host Payout = rental_amount - commission_host
    """
    
    listing = Listing.objects.get(id=listing_id)
    rental_days = (end_date - start_date).days
    
    # Base calculations
    rental_amount = Decimal(str(listing.daily_price)) * Decimal(str(rental_days))
    commission_host = rental_amount * Decimal('0.12')
    commission_guest = rental_amount * Decimal('0.06')
    platform_commission = commission_host + commission_guest
    
    deposit = listing.deposit_required
    insurance_fee = Decimal('100.00')  # Fixed or configurable
    
    guest_total = rental_amount + commission_guest + deposit + insurance_fee
    host_payout = rental_amount - commission_host
    
    return {
        'rental_amount': rental_amount,
        'commission_host': commission_host,
        'commission_guest': commission_guest,
        'platform_commission': platform_commission,
        'deposit': deposit,
        'insurance_fee': insurance_fee,
        'guest_total': guest_total,
        'host_payout': host_payout,
    }
```

---

## 🔒 Inventory Blocking (Prevent Double Booking)

### Race Condition Prevention

**Implementation in `bookings/models.py`:**

```python
from django.db import transaction
from django.db.models import Q

def block_inventory(self):
    """Block dates for this listing"""
    from listings.models import Listing
    
    listing = self.listing
    
    # Use atomic transaction to prevent race conditions
    with transaction.atomic():
        # Check no other confirmed bookings exist for these dates
        conflicting = Booking.objects.select_for_update().filter(
            listing=listing,
            booking_status__in=['confirmed', 'in_use', 'returned'],
            start_date__lt=self.end_date,
            end_date__gt=self.start_date
        ).exists()
        
        if conflicting:
            raise ValueError("Dates not available - already booked")
        
        # Mark listing as unavailable for dates
        listing.is_available = False
        listing.save()

def unblock_inventory(self):
    """Unblock dates (on cancellation)"""
    from listings.models import Listing
    
    # Check if any other active bookings exist
    other_bookings = Booking.objects.filter(
        listing=self.listing,
        booking_status__in=['confirmed', 'in_use', 'returned']
    ).exclude(id=self.id).exists()
    
    if not other_bookings:
        self.listing.is_available = True
        self.listing.save()
```

---

## 🎯 QR Code Generation & Verification

### Implementation in `bookings/models.py`

```python
import qrcode
from io import BytesIO

def generate_qr_code(self):
    """Generate QR code for handover/return verification"""
    from django.core.files import File
    
    # Create unique token
    self.qr_token = f"{self.id}-{timezone.now().timestamp()}"
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(self.qr_token)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save to model
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    self.qr_code.save(f'qr_{self.id}.png', File(buffer), save=False)
    self.save()
```

---

## 👮 Admin Dispute Resolution

### Resolution Workflow

**Implementation in `bookings/views.py`:**

```python
class DisputeResolutionView(generics.GenericAPIView):
    """Admin resolves disputes"""
    serializer_class = DisputeResolutionSerializer
    permission_classes = [IsAdmin]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        booking_id = serializer.validated_data['booking_id']
        resolution = serializer.validated_data['resolution']
        refund_amount = serializer.validated_data.get('refund_amount')
        
        booking = get_object_or_404(Booking, id=booking_id, dispute_flag=True)
        
        if resolution == 'refund_full':
            # Refund entire guest amount
            booking.escrow_status = 'refunded_to_guest'
            refund_amount = booking.guest_total
            
        elif resolution == 'refund_partial':
            # Refund specified amount
            booking.escrow_status = 'refunded_to_guest'
            
        elif resolution == 'keep_with_host':
            # Host keeps payment
            booking.escrow_status = 'released_to_host'
        
        booking.booking_status = 'completed'
        booking.dispute_resolved_at = timezone.now()
        booking.dispute_resolution = resolution
        booking.save()
        
        # Process refund via Razorpay
        if refund_amount and resolution.startswith('refund'):
            process_refund(booking, refund_amount)
        
        return Response({'message': 'Dispute resolved successfully'})
```

---

## 📊 Admin Dashboard

### Dashboard Metrics

**Implementation in `crm/views.py`:**

```python
@api_view(['GET'])
@permission_classes([IsAdmin])
def dashboard_view(request):
    """Admin dashboard with key metrics"""
    
    from django.utils import timezone
    from datetime import timedelta
    
    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)
    
    # User metrics
    total_users = User.objects.count()
    active_users = User.objects.filter(last_login__gte=thirty_days_ago).count()
    verified_hosts = User.objects.filter(kyc_status='verified', role__in=['host', 'both']).count()
    
    # Listing metrics
    total_listings = Listing.objects.count()
    approved_listings = Listing.objects.filter(verification_status='approved').count()
    pending_listings = Listing.objects.filter(verification_status='pending').count()
    
    # Booking metrics
    total_bookings = Booking.objects.count()
    completed_bookings = Booking.objects.filter(booking_status='completed').count()
    disputed_bookings = Booking.objects.filter(dispute_flag=True).count()
    
    # Revenue metrics
    completed = Booking.objects.filter(booking_status='completed')
    total_revenue = completed.aggregate(Sum('guest_total'))['guest_total__sum'] or 0
    platform_commission = completed.aggregate(Sum('platform_commission'))['platform_commission__sum'] or 0
    pending_payouts = Booking.objects.filter(
        booking_status='completed',
        escrow_status='released_to_host'
    ).aggregate(Sum('host_payout'))['host_payout__sum'] or 0
    
    return Response({
        'total_users': total_users,
        'active_users_this_month': active_users,
        'verified_hosts': verified_hosts,
        'total_listings': total_listings,
        'approved_listings': approved_listings,
        'pending_listings': pending_listings,
        'total_bookings': total_bookings,
        'completed_bookings': completed_bookings,
        'disputed_bookings': disputed_bookings,
        'total_revenue': str(total_revenue),
        'platform_commission': str(platform_commission),
        'pending_host_payouts': str(pending_payouts),
    })
```

---

## 🚀 API Endpoints Summary

### Authentication
- `POST /api/users/register/` - Register user
- `POST /api/users/login/` - Login user
- `POST /api/users/token/refresh/` - Refresh token
- `GET /api/users/profile/` - Get profile

### KYC Verification
- `POST /api/users/kyc/submit/` - Submit KYC
- `GET /api/users/kyc/pending/` - Admin: View pending
- `POST /api/users/kyc/verify/` - Admin: Verify KYC

### Listings
- `GET /api/listings/` - List all listings
- `POST /api/listings/create/` - Create listing
- `GET /api/listings/{id}/` - Get listing detail
- `PUT /api/listings/{id}/update/` - Update listing
- `DELETE /api/listings/{id}/delete/` - Delete listing
- `POST /api/listings/{id}/images/` - Upload image
- `GET /api/listings/categories/` - Get categories
- `GET /api/listings/pending/` - Admin: Pending listings
- `POST /api/listings/verify/` - Admin: Verify listing

### Bookings
- `POST /api/bookings/create/` - Create booking
- `GET /api/bookings/my-bookings/` - My bookings
- `GET /api/bookings/{id}/` - Booking detail
- `POST /api/bookings/{id}/confirm/` - Confirm booking
- `POST /api/bookings/handover/` - Handover (QR)
- `POST /api/bookings/return/` - Return (QR)
- `POST /api/bookings/{id}/complete/` - Complete booking
- `POST /api/bookings/raise-dispute/` - Raise dispute
- `GET /api/bookings/disputed/` - Admin: Disputed bookings
- `POST /api/bookings/resolve-dispute/` - Admin: Resolve dispute
- `POST /api/bookings/cancel/` - Cancel booking
- `POST /api/bookings/calculate-price/` - Calculate price
- `GET /api/bookings/blocked-dates/{listing_id}/` - Check blocked dates

### Payments
- `POST /api/payments/create-order/{booking_id}/` - Create Razorpay order
- `POST /api/payments/verify/` - Verify payment
- `GET /api/payments/transactions/` - Transaction history

### Admin
- `GET /api/crm/dashboard/` - Dashboard metrics
- `GET /api/crm/revenue-report/` - Revenue report

---

## 🧪 Running Tests

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test bookings

# With verbose output
python manage.py test --verbosity=2

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

---

## 🔧 Development Commands

```bash
# Create superuser
python manage.py createsuperuser

# Create sample data
python manage.py shell
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> # Create test users
>>> # Create listings
>>> # Create bookings

# Generate migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Run development server
python manage.py runserver 127.0.0.1:8001
```

---

## 📱 Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── Navbar.jsx
│   ├── PrivateRoute.jsx
│   └── ...
├── pages/
│   ├── Home.jsx              # Browse listings
│   ├── CreateListing.jsx     # Create/edit listing
│   ├── ListingDetails.jsx    # View listing detail
│   ├── BookingPage.jsx       # Create booking
│   ├── Dashboard.jsx         # User dashboard
│   ├── HostDashboard.jsx     # Host bookings
│   ├── GuestDashboard.jsx    # Guest bookings
│   ├── AdminDashboard.jsx    # Admin panel
│   ├── Login.jsx
│   ├── Register.jsx
│   └── Auth.jsx
└── services/
    └── api.js                # Axios API wrapper
```

### State Management

Uses React Hooks (useState, useContext) with localStorage for auth tokens.

---

## ✅ Features Checklist

### Core Features ✅
- [x] Custom user model with roles
- [x] JWT authentication with refresh tokens
- [x] KYC verification workflow
- [x] Trust score system
- [x] Gold host program
- [x] Listing CRUD with categories
- [x] Image uploads
- [x] Advanced filtering
- [x] Booking creation and state management
- [x] Commission calculation
- [x] Inventory blocking
- [x] QR code generation
- [x] Razorpay payment integration
- [x] Dispute resolution
- [x] Admin dashboard

### Advanced Features ✅
- [x] Race condition prevention
- [x] Atomic transactions
- [x] Review & rating system
- [x] Referral program
- [x] Lead capture system
- [x] Email notifications
- [x] Date blocking
- [x] Admin analytics

---

## 📞 Support

For issues or questions:
1. Check TESTING_GUIDE.md for endpoint examples
2. Review API_DOCUMENTATION.md for detailed specs
3. Check backend logs: `tail -f omnishare_backend/logs/django.log`
4. Check browser console for frontend errors
