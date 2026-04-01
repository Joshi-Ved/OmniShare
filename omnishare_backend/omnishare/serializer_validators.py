"""
Serializer Validators for OWASP Compliance
Use these validators in your Django REST serializers
"""

from rest_framework import serializers
from django.core.exceptions import ValidationError
from omnishare.security import InputValidator, SQLInjectionProtection, XSSProtection


class SecurityValidatorsMixin:
    """
    Mixin to add OWASP-compliant validators to serializers
    
    Usage:
        class MySerializer(SecurityValidatorsMixin, serializers.ModelSerializer):
            pass
    """
    
    def validate_email(self, value):
        """Validate email format and prevent injection"""
        return InputValidator.validate_email(value)
    
    def validate_phone(self, value):
        """Validate phone number format"""
        return InputValidator.validate_phone(value)
    
    def validate_name(self, value):
        """Sanitize name input"""
        return InputValidator.sanitize_string(value, max_length=255)
    
    def validate_description(self, value):
        """Sanitize description input"""
        return InputValidator.sanitize_string(value, max_length=2000)
    
    def validate_search_query(self, value):
        """Validate and sanitize search input"""
        return SQLInjectionProtection.validate_search_input(value)


class URLField(serializers.URLField):
    """Enhanced URL field with XSS protection"""
    
    def validate_url(self, value):
        """Additional URL validation to prevent XSS"""
        if not XSSProtection.is_safe_url(value):
            raise ValidationError("URL contains invalid protocol. Only HTTP/HTTPS allowed.")
        return super().validate_url(value)


class SafeCharField(serializers.CharField):
    """CharField that automatically sanitizes input"""
    
    def __init__(self, max_length=255, **kwargs):
        self.max_length = max_length
        super().__init__(max_length=max_length, **kwargs)
    
    def to_internal_value(self, data):
        """Sanitize input"""
        value = super().to_internal_value(data)
        return InputValidator.sanitize_string(value, max_length=self.max_length)


class SafeIntegerField(serializers.IntegerField):
    """IntegerField with bounds validation"""
    
    def __init__(self, min_value=None, max_value=None, **kwargs):
        self.min_value = min_value
        self.max_value = max_value
        super().__init__(**kwargs)
    
    def to_internal_value(self, data):
        """Validate with bounds"""
        try:
            return InputValidator.validate_integer(data, min_val=self.min_value, max_val=self.max_value)
        except ValidationError:
            self.fail('invalid')


class SafeDecimalField(serializers.DecimalField):
    """DecimalField with bounds validation"""
    
    def __init__(self, max_digits, decimal_places, min_value=None, max_value=None, **kwargs):
        self.min_value = min_value
        self.max_value = max_value
        super().__init__(max_digits=max_digits, decimal_places=decimal_places, **kwargs)
    
    def to_internal_value(self, data):
        """Validate with bounds"""
        try:
            return InputValidator.validate_decimal(data, min_val=self.min_value, max_val=self.max_value)
        except ValidationError:
            self.fail('invalid')
