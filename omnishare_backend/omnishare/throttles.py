"""
Advanced Rate Limiting for API Endpoints
Implements per-endpoint and user-based throttling
"""

from rest_framework.throttling import UserRateThrottle, AnonRateThrottle, ScopedRateThrottle


class UserThrottle(UserRateThrottle):
    """Throttle for authenticated users - 2000 requests per hour"""
    scope = 'user'


class AnonThrottle(AnonRateThrottle):
    """Throttle for anonymous/unauthenticated users - 200 requests per hour"""
    scope = 'anon'


class StrictSearchThrottle(ScopedRateThrottle):
    """Strict throttle for search endpoints - 50 requests per hour"""
    scope = 'search'


class PaymentThrottle(ScopedRateThrottle):
    """Throttle for payment endpoints - 20 requests per hour (prevent abuse)"""
    scope = 'payment'


class LoginThrottle(ScopedRateThrottle):
    """Throttle for login attempts - 10 requests per hour (prevent brute force)"""
    scope = 'login'


class BookingThrottle(ScopedRateThrottle):
    """Throttle for booking endpoints - 100 requests per hour"""
    scope = 'booking'


class LeadCaptureThrottle(ScopedRateThrottle):
    """Throttle for lead capture - 30 per hour"""
    scope = 'lead_capture'


# Throttle rate configurations (requests/time_window)
THROTTLE_RATES = {
    'user': '2000/hour',           # Authenticated users
    'anon': '200/hour',             # Anonymous users
    'search': '50/hour',            # Search queries
    'payment': '20/hour',           # Payment operations (strict)
    'login': '10/hour',             # Login attempts (brute force prevention)
    'booking': '100/hour',          # Booking operations
    'lead_capture': '30/hour',      # Lead capture forms
}
