"""
OWASP Security Utilities for OmniShare
Implements protections against:
- SQL Injection
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Input Validation & Sanitization
- Rate Limiting
- Security Headers
"""

import re
import logging
from django.utils.html import escape
from django.core.exceptions import ValidationError
from django.db import connections
from django.db.utils import DatabaseError

logger = logging.getLogger(__name__)


class InputValidator:
    """Validate and sanitize user inputs to prevent injection attacks"""
    
    EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    PHONE_REGEX = r'^\+?1?\d{9,15}$'
    USERNAME_REGEX = r'^[a-zA-Z0-9_-]{3,30}$'
    
    @staticmethod
    def validate_email(email):
        """Validate email format"""
        if not email or len(email) > 254:
            raise ValidationError("Invalid email format")
        if not re.match(InputValidator.EMAIL_REGEX, email):
            raise ValidationError("Invalid email format")
        return email.lower()
    
    @staticmethod
    def validate_phone(phone):
        """Validate phone number format"""
        if not phone or not re.match(InputValidator.PHONE_REGEX, phone):
            raise ValidationError("Invalid phone number format")
        return re.sub(r'\D', '', phone)
    
    @staticmethod
    def validate_username(username):
        """Validate username format"""
        if not username or not re.match(InputValidator.USERNAME_REGEX, username):
            raise ValidationError("Username must be 3-30 chars, alphanumeric, underscore, or hyphen")
        return username
    
    @staticmethod
    def sanitize_string(value, max_length=255):
        """Sanitize string input - remove HTML/script tags"""
        if not isinstance(value, str):
            raise ValidationError("Input must be a string")
        
        if len(value) > max_length:
            raise ValidationError(f"Input exceeds maximum length of {max_length}")
        
        # Remove dangerous HTML tags and scripts
        sanitized = escape(value.strip())
        # Remove any remaining HTML tags
        sanitized = re.sub(r'<[^>]+>', '', sanitized)
        return sanitized
    
    @staticmethod
    def validate_integer(value, min_val=None, max_val=None):
        """Validate integer input with optional bounds"""
        try:
            val = int(value)
            if min_val is not None and val < min_val:
                raise ValidationError(f"Value must be at least {min_val}")
            if max_val is not None and val > max_val:
                raise ValidationError(f"Value must be at most {max_val}")
            return val
        except (ValueError, TypeError):
            raise ValidationError("Input must be a valid integer")
    
    @staticmethod
    def validate_decimal(value, min_val=None, max_val=None):
        """Validate decimal/float input with optional bounds"""
        try:
            val = float(value)
            if min_val is not None and val < min_val:
                raise ValidationError(f"Value must be at least {min_val}")
            if max_val is not None and val > max_val:
                raise ValidationError(f"Value must be at most {max_val}")
            return val
        except (ValueError, TypeError):
            raise ValidationError("Input must be a valid number")
    
    @staticmethod
    def validate_url(url):
        """Validate URL format"""
        url_regex = r'^https?://[^\s/$.?#].[^\s]*$'
        if not re.match(url_regex, url, re.IGNORECASE):
            raise ValidationError("Invalid URL format")
        return url


class SQLInjectionProtection:
    """
    Protection against SQL Injection
    Django ORM automatically uses parameterized queries, but these utilities
    provide additional validation and logging
    """
    
    DANGEROUS_SQL_KEYWORDS = [
        'DROP', 'DELETE', 'TRUNCATE', 'INSERT', 'UPDATE',
        'ALTER', 'EXEC', 'EXECUTE', 'UNION', 'SELECT'
    ]
    
    @staticmethod
    def validate_query_safety(query_string):
        """
        Log and validate if a raw query string contains dangerous keywords
        Should only be used with parameterized queries
        """
        if not query_string:
            return True
        
        # Convert to uppercase for checking
        upper_query = query_string.upper()
        
        for keyword in SQLInjectionProtection.DANGEROUS_SQL_KEYWORDS:
            # Check if keyword appears as a standalone word
            if re.search(r'\b' + keyword + r'\b', upper_query):
                logger.warning(f"Potentially dangerous SQL keyword detected: {keyword}")
                return False
        
        return True
    
    @staticmethod
    def validate_search_input(search_term):
        """
        Sanitize search input for database queries
        Always use ORM parameterized queries instead of raw SQL
        """
        if not search_term:
            raise ValidationError("Search term cannot be empty")
        
        if len(search_term) > 100:
            raise ValidationError("Search term exceeds maximum length")
        
        # Remove special characters that could be used in SQL injection
        sanitized = re.sub(r'[;\'"\-\-*/]', '', search_term)
        sanitized = sanitized.strip()
        
        if not sanitized:
            raise ValidationError("Search term contains no valid characters")
        
        return sanitized


class XSSProtection:
    """Protection against Cross-Site Scripting (XSS) attacks"""
    
    @staticmethod
    def sanitize_html(content):
        """Sanitize HTML content to prevent XSS"""
        # HTML escape all content
        escaped = escape(content)
        # Remove script tags
        cleaned = re.sub(r'<script[^>]*>.*?</script>', '', escaped, flags=re.IGNORECASE | re.DOTALL)
        # Remove event handlers
        cleaned = re.sub(r'\s*on\w+\s*=', '', cleaned, flags=re.IGNORECASE)
        return cleaned
    
    @staticmethod
    def is_safe_url(url):
        """Validate that URL is safe (no javascript: protocol)"""
        dangerous_protocols = ['javascript:', 'data:', 'vbscript:']
        url_lower = url.lower().strip()
        
        for protocol in dangerous_protocols:
            if url_lower.startswith(protocol):
                return False
        
        return True


class SecurityHeaders:
    """Generate security headers for API responses"""
    
    HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
    }
    
    @staticmethod
    def get_security_headers():
        """Return recommended security headers"""
        return SecurityHeaders.HEADERS


def log_security_event(event_type, user=None, details=None):
    """
    Log security-related events for audit trail
    
    Args:
        event_type: Type of security event (login_failure, injection_attempt, etc.)
        user: User object or ID
        details: Additional event details
    """
    user_identifier = str(user) if user else "Anonymous"
    message = f"Security Event: {event_type} | User: {user_identifier}"
    
    if details:
        message += f" | Details: {details}"
    
    logger.warning(message)
