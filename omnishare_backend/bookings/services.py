"""
Business logic services for bookings
"""
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from .models import Booking, BookingDateLock


def check_availability(listing, start_date, end_date, exclude_booking_id=None):
    """
    Check if listing is available for given date range
    Prevents double booking
    """
    # Check for overlapping bookings
    overlapping_query = Q(
        listing=listing,
        start_date__lt=end_date,
        end_date__gt=start_date
    ) & ~Q(
        booking_status__in=['cancelled', 'disputed', 'completed']
    )
    
    if exclude_booking_id:
        overlapping_query &= ~Q(id=exclude_booking_id)
    
    overlapping_bookings = Booking.objects.filter(overlapping_query)
    
    if overlapping_bookings.exists():
        return False, "Dates are already booked"
    
    # Check for active date locks
    overlapping_locks = BookingDateLock.objects.filter(
        listing=listing,
        start_date__lt=end_date,
        end_date__gt=start_date,
        expires_at__gt=timezone.now()
    )
    
    if overlapping_locks.exists():
        return False, "Dates are temporarily locked by another user"
    
    # Check listing availability dates
    if start_date < listing.availability_start or end_date > listing.availability_end:
        return False, "Dates outside listing availability range"
    
    return True, "Available"


@transaction.atomic
def create_booking_with_lock(listing, guest, start_date, end_date, insurance_fee=0):
    """
    Create booking with date locking to prevent race conditions
    """
    # Clean up expired locks first
    BookingDateLock.cleanup_expired()
    
    # Check availability
    available, message = check_availability(listing, start_date, end_date)
    if not available:
        raise ValueError(message)
    
    # Create temporary lock
    lock = BookingDateLock.create_lock(listing, start_date, end_date, guest)
    
    try:
        # Create booking
        booking = Booking.objects.create(
            listing=listing,
            guest=guest,
            host=listing.host,
            start_date=start_date,
            end_date=end_date,
            insurance_fee=insurance_fee
        )
        
        # Delete the lock since booking is created
        lock.delete()
        
        return booking
    
    except Exception as e:
        # If anything fails, lock will expire automatically
        raise e


def get_blocked_dates(listing):
    """
    Get all blocked dates for a listing
    Used for calendar display
    """
    from datetime import timedelta
    
    blocked_dates = []
    
    # Get all confirmed/in-use bookings
    active_bookings = Booking.objects.filter(
        listing=listing,
        booking_status__in=['confirmed', 'in_use']
    )
    
    for booking in active_bookings:
        current_date = booking.start_date
        while current_date <= booking.end_date:
            blocked_dates.append(current_date.isoformat())
            current_date += timedelta(days=1)
    
    return blocked_dates


def calculate_booking_price(listing, start_date, end_date):
    """
    Calculate pricing breakdown for a potential booking
    """
    from django.conf import settings
    from datetime import timedelta
    
    delta = end_date - start_date
    rental_days = max(1, delta.days)
    
    rental_amount = listing.daily_price * rental_days
    commission_host = rental_amount * settings.PLATFORM_COMMISSION_HOST
    commission_guest = rental_amount * settings.PLATFORM_COMMISSION_GUEST
    platform_commission = commission_host + commission_guest
    
    # Default insurance: 5% of rental amount
    insurance_fee = rental_amount * 0.05
    
    guest_total = rental_amount + commission_guest + listing.deposit + insurance_fee
    host_payout = rental_amount - commission_host
    
    return {
        'rental_days': rental_days,
        'daily_price': float(listing.daily_price),
        'rental_amount': float(rental_amount),
        'commission_guest': float(commission_guest),
        'deposit': float(listing.deposit),
        'insurance_fee': float(insurance_fee),
        'guest_total': float(guest_total),
        'host_payout': float(host_payout),
        'platform_commission': float(platform_commission)
    }


def verify_qr_code(booking_id, qr_token):
    """
    Verify QR code for handover/return
    """
    try:
        booking = Booking.objects.get(id=booking_id, qr_token=qr_token)
        return True, booking
    except Booking.DoesNotExist:
        return False, None
