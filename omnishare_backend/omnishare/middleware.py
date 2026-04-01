"""
OWASP-Compliant Security Middleware
Provides defense-in-depth security headers and request filtering
"""

import logging
from django.conf import settings
from omnishare.security import log_security_event

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware:
    """
    Adds defense-in-depth headers aligned to OWASP secure defaults.
    Prevents XSS, Clickjacking, MIME sniffing, and other attacks.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Prevent MIME type sniffing (XSS protection)
        response.setdefault('X-Content-Type-Options', 'nosniff')
        
        # Prevent clickjacking attacks
        response.setdefault('X-Frame-Options', 'DENY')
        
        # Control referrer information
        response.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        
        # Restrict feature permissions
        response.setdefault('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
        
        # Content Security Policy - prevent XSS and injection attacks
        if settings.DEBUG:
            csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:"
        else:
            csp = "default-src 'self'; script-src 'self' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'"
        
        response['Content-Security-Policy'] = csp
        
        # HSTS - Force HTTPS in production
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        
        # XSS Protection (legacy header, still useful)
        response['X-XSS-Protection'] = '1; mode=block'
        
        return response


class SecurityAuditMiddleware:
    """
    Logs suspicious requests for security auditing
    """
    
    SUSPICIOUS_PATTERNS = [
        '../',           # Path traversal
        '..\\',          # Path traversal (Windows)
        'union',         # SQL injection attempt
        'select',        # SQL injection attempt
        'drop',          # SQL injection attempt
        'insert',        # SQL injection attempt
        'delete',        # SQL injection attempt
        '<script',       # XSS attempt
        'javascript:',   # XSS attempt
        '<%',            # Server-side injection
        '%>',            # Server-side injection
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check request path and query string for suspicious patterns
        full_path = f"{request.path}?{request.GET.urlencode()}"
        
        for pattern in self.SUSPICIOUS_PATTERNS:
            if pattern.lower() in full_path.lower():
                log_security_event(
                    event_type='suspicious_request',
                    user=request.user if request.user.is_authenticated else None,
                    details=f"Pattern '{pattern}' detected in path: {request.path}"
                )
                break
        
        response = self.get_response(request)
        return response


class RateLimitHeadersMiddleware:
    """
    Adds rate limit information to response headers
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add rate limit headers if throttling is enforced
        if hasattr(request, 'throttle_rates'):
            response['X-RateLimit-Limit'] = str(request.throttle_rates.get('limit', 'N/A'))
            response['X-RateLimit-Remaining'] = str(request.throttle_rates.get('remaining', 'N/A'))
            response['X-RateLimit-Reset'] = str(request.throttle_rates.get('reset', 'N/A'))
        
        return response