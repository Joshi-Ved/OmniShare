"""
Custom Exception Handler for OWASP Compliance
Prevents information disclosure through error messages
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.exceptions import APIException
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that:
    - Prevents information disclosure
    - Logs detailed errors securely
    - Returns safe error messages to clients
    """
    
    response = None
    
    # Log the exception for debugging (server-side only)
    user = context['request'].user if 'request' in context else None
    logger.error(
        f"Exception: {exc.__class__.__name__} | User: {user} | Details: {str(exc)}",
        exc_info=True
    )
    
    # Handle throttling (rate limit exceeded)
    if exc.__class__.__name__ == 'Throttled':
        return Response(
            {
                'error': 'Too many requests. Please wait before making another request.',
                'retry_after': exc.wait()
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )
    
    # Handle authentication errors
    if exc.__class__.__name__ in ['AuthenticationFailed', 'NotAuthenticated']:
        return Response(
            {'error': 'Authentication credentials are invalid or missing.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Handle permission errors
    if exc.__class__.__name__ == 'PermissionDenied':
        return Response(
            {'error': 'You do not have permission to perform this action.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Handle validation errors
    if exc.__class__.__name__ == 'ValidationError':
        return Response(
            {'error': 'Invalid input provided. Please check your request.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Handle 404 errors
    if exc.__class__.__name__ == 'NotFound':
        return Response(
            {'error': 'The requested resource was not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Generic error handling for unexpected exceptions
    if isinstance(exc, APIException):
        return Response(
            {'error': 'An error occurred processing your request.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Database errors
    if exc.__class__.__name__ in ['DatabaseError', 'IntegrityError', 'OperationalError']:
        logger.error(f"Database Error: {str(exc)}")
        return Response(
            {'error': 'A database error occurred. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Default response for unknown errors
    return Response(
        {'error': 'An unexpected error occurred. Please contact support.'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
