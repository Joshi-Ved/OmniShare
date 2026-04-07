from django.contrib import admin
from django.contrib import messages
from django.conf import settings
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.core.mail import send_mail
from django.utils import timezone
from .models import User, Notification


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'kyc_status', 'loyalty_coins', 'trust_score', 'gold_host_flag', 'is_active']
    list_filter = ['role', 'kyc_status', 'gold_host_flag', 'is_active']
    search_fields = ['username', 'email', 'phone_number']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('role', 'phone_number', 'kyc_status', 'kyc_document',
                      'loyalty_coins', 'trust_score', 'gold_host_flag', 'total_bookings', 'profile_image')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {
            'fields': ('role', 'phone_number', 'email')
        }),
    )


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'recipient', 'notification_type', 'coin_amount', 'is_read', 'is_claimed', 'email_sent_at', 'created_at']
    list_filter = ['notification_type', 'is_read', 'is_claimed', 'created_at']
    search_fields = ['title', 'message', 'recipient__username', 'recipient__email']
    autocomplete_fields = ['recipient', 'sender']
    readonly_fields = ['created_at', 'updated_at', 'read_at', 'claimed_at', 'email_sent_at']
    fieldsets = (
        ('Delivery', {
            'fields': ('recipient', 'sender', 'notification_type')
        }),
        ('Content', {
            'fields': ('title', 'message', 'coin_amount')
        }),
        ('Status', {
            'fields': ('is_read', 'read_at', 'is_claimed', 'claimed_at', 'email_sent_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    def save_model(self, request, obj, form, change):
        if not obj.sender_id:
            obj.sender = request.user

        is_new = obj.pk is None
        super().save_model(request, obj, form, change)

        if is_new and obj.recipient.email:
            try:
                send_mail(
                    subject=obj.title,
                    message=obj.message,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@omnishare.local'),
                    recipient_list=[obj.recipient.email],
                    fail_silently=False,
                )
                obj.email_sent_at = timezone.now()
                obj.save(update_fields=['email_sent_at'])
            except Exception as exc:
                self.message_user(
                    request,
                    f'Notification saved but email delivery failed: {exc}',
                    level=messages.WARNING,
                )
