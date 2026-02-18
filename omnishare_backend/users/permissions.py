from rest_framework import permissions


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow users to edit their own profile or admin
    """
    def has_object_permission(self, request, view, obj):
        # Admin has full access
        if request.user.is_staff or request.user.role == 'admin':
            return True
        
        # User can only access their own profile
        return obj == request.user


class IsAdmin(permissions.BasePermission):
    """
    Permission for admin-only views
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or request.user.role == 'admin'
        )


class IsVerifiedHost(permissions.BasePermission):
    """
    Permission for verified hosts only
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.is_host() and
            request.user.kyc_status == 'verified'
        )


class IsVerifiedGuest(permissions.BasePermission):
    """
    Permission for verified guests only
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.is_guest() and
            request.user.kyc_status == 'verified'
        )


class IsKYCVerified(permissions.BasePermission):
    """
    Permission for KYC verified users
    """
    message = "KYC verification required to perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.kyc_status == 'verified'
        )
