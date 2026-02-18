from django.contrib import admin
from .models import Lead, ReferralCode, Referral


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['email', 'name', 'source', 'interested_in', 'created_at']
    list_filter = ['source', 'interested_in', 'created_at']
    search_fields = ['email', 'name', 'phone']


@admin.register(ReferralCode)
class ReferralCodeAdmin(admin.ModelAdmin):
    list_display = ['user', 'code', 'uses', 'created_at']
    search_fields = ['user__username', 'code']


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ['referrer', 'referred', 'code_used', 'created_at']
    list_filter = ['created_at']
    search_fields = ['referrer__username', 'referred__username']
