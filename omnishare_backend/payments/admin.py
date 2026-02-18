from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'user', 'transaction_type', 'amount', 'status', 'created_at']
    list_filter = ['status', 'transaction_type', 'created_at']
    search_fields = ['razorpay_payment_id', 'razorpay_order_id', 'user__username']
    readonly_fields = ['created_at', 'completed_at']
