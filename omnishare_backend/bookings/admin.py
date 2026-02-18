from django.contrib import admin
from .models import Booking, BookingDateLock


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'listing', 'guest', 'host', 'start_date', 'end_date',
        'booking_status', 'guest_total', 'dispute_flag', 'created_at'
    ]
    list_filter = ['booking_status', 'escrow_status', 'dispute_flag', 'created_at']
    search_fields = ['listing__title', 'guest__username', 'host__username']
    readonly_fields = [
        'created_at', 'confirmed_at', 'handover_at', 'return_at',
        'completed_at', 'cancelled_at', 'qr_token'
    ]
    
    fieldsets = (
        ('Booking Details', {
            'fields': ('listing', 'guest', 'host', 'start_date', 'end_date', 'rental_days')
        }),
        ('Financial Details', {
            'fields': (
                'daily_price', 'rental_amount', 'commission_host', 'commission_guest',
                'platform_commission', 'deposit', 'insurance_fee', 'guest_total', 'host_payout'
            )
        }),
        ('Status', {
            'fields': ('booking_status', 'escrow_status', 'qr_code', 'qr_token')
        }),
        ('Timestamps', {
            'fields': (
                'created_at', 'confirmed_at', 'handover_at',
                'return_at', 'completed_at', 'cancelled_at'
            )
        }),
        ('Dispute', {
            'fields': (
                'dispute_flag', 'dispute_raised_by', 'dispute_reason',
                'dispute_raised_at', 'dispute_resolution', 'dispute_resolved_at'
            )
        }),
        ('Cancellation', {
            'fields': ('cancelled_by', 'cancellation_reason')
        }),
    )


@admin.register(BookingDateLock)
class BookingDateLockAdmin(admin.ModelAdmin):
    list_display = ['listing', 'start_date', 'end_date', 'locked_by', 'locked_at', 'expires_at']
    list_filter = ['locked_at', 'expires_at']
    search_fields = ['listing__title', 'locked_by__username']
