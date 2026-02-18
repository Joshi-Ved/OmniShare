from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'kyc_status', 'trust_score', 'gold_host_flag', 'is_active']
    list_filter = ['role', 'kyc_status', 'gold_host_flag', 'is_active']
    search_fields = ['username', 'email', 'phone_number']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('role', 'phone_number', 'kyc_status', 'kyc_document', 
                      'trust_score', 'gold_host_flag', 'total_bookings', 'profile_image')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {
            'fields': ('role', 'phone_number', 'email')
        }),
    )
