"""
Enhanced Payment Serializers
Serializes payment models for API endpoints
"""

from rest_framework import serializers
from .models import (
    Transaction, EscrowAccount, CommissionSplit,
    Settlement, Invoice, WebhookLog
)


class CommissionSplitSerializer(serializers.ModelSerializer):
    """Serializer for CommissionSplit model"""
    
    class Meta:
        model = CommissionSplit
        fields = [
            'id', 'booking', 'escrow', 'rental_amount',
            'commission_host', 'commission_guest', 'total_commission',
            'guest_total', 'host_payout', 'platform_earnings',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EscrowAccountSerializer(serializers.ModelSerializer):
    """Serializer for EscrowAccount model"""
    
    commission_split = CommissionSplitSerializer(read_only=True)
    
    class Meta:
        model = EscrowAccount
        fields = [
            'id', 'booking', 'guest', 'host',
            'total_amount', 'rental_amount', 'guest_commission',
            'host_commission', 'platform_revenue', 'status',
            'held_until', 'released_at', 'refunded_at',
            'commission_split', 'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'released_at', 'refunded_at', 'created_at', 'updated_at']


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model"""
    
    booking_details = serializers.SerializerMethodField()
    escrow = EscrowAccountSerializer(read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'booking', 'booking_details', 'user',
            'amount', 'status', 'transaction_type', 'payment_gateway',
            'razorpay_order_id', 'razorpay_payment_id', 'razorpay_refund_id',
            'refund_status', 'escrow', 'processed_at',
            'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'processed_at', 'created_at', 'updated_at',
            'razorpay_order_id', 'razorpay_payment_id', 'razorpay_refund_id'
        ]
    
    def get_booking_details(self, obj):
        """Include booking details in response"""
        if obj.booking:
            return {
                'id': obj.booking.id,
                'listing_title': obj.booking.listing.title if obj.booking.listing else '',
                'start_date': obj.booking.start_date,
                'end_date': obj.booking.end_date,
                'guest_name': obj.booking.guest.get_full_name() or obj.booking.guest.username,
                'host_name': obj.booking.host.get_full_name() or obj.booking.host.username,
            }
        return None


class SettlementSerializer(serializers.ModelSerializer):
    """Serializer for Settlement model"""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Settlement
        fields = [
            'id', 'user', 'user_name', 'escrow', 'settlement_type',
            'amount', 'status', 'processed_at', 'razorpay_transfer_id',
            'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'processed_at', 'razorpay_transfer_id',
            'created_at', 'updated_at'
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Invoice model"""
    
    guest_name = serializers.CharField(source='guest.get_full_name', read_only=True)
    host_name = serializers.CharField(source='host.get_full_name', read_only=True)
    booking_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'booking', 'booking_details', 'guest', 'guest_name',
            'host', 'host_name', 'invoice_number', 'invoice_date',
            'due_date', 'subtotal', 'platform_commission', 'total_amount',
            'pdf_generated', 'pdf_file', 'sent_to_guest', 'payment_terms',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'invoice_date', 'pdf_generated',
            'pdf_file', 'sent_to_guest', 'created_at', 'updated_at'
        ]
    
    def get_booking_details(self, obj):
        """Include booking details in response"""
        if obj.booking:
            return {
                'id': obj.booking.id,
                'listing_title': obj.booking.listing.title if obj.booking.listing else '',
                'start_date': obj.booking.start_date,
                'end_date': obj.booking.end_date,
                'rental_days': obj.booking.rental_days,
                'status': obj.booking.status,
            }
        return None


class WebhookLogSerializer(serializers.ModelSerializer):
    """Serializer for WebhookLog model"""
    
    class Meta:
        model = WebhookLog
        fields = [
            'id', 'webhook_id', 'event_type', 'payload',
            'ip_address', 'verified', 'processed', 'metadata',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at'
        ]


# Summary Serializers for Dashboard

class PaymentSummarySerializer(serializers.Serializer):
    """Summary of user payment activity"""
    
    total_spent = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_earned = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_settlements = serializers.IntegerField()
    total_bookings = serializers.IntegerField()
    completed_bookings = serializers.IntegerField()
    cancelled_bookings = serializers.IntegerField()


class SettlementSummarySerializer(serializers.Serializer):
    """Summary of host settlements"""
    
    total_settlements = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_settlement = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    completed_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
