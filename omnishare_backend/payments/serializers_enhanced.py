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
            'calculated_at'
        ]
        read_only_fields = ['id', 'calculated_at']


class EscrowAccountSerializer(serializers.ModelSerializer):
    """Serializer for EscrowAccount model"""
    
    commission_split = serializers.SerializerMethodField()
    
    class Meta:
        model = EscrowAccount
        fields = [
            'id', 'booking', 'guest', 'host',
            'total_amount', 'rental_amount', 'guest_commission',
            'host_commission', 'platform_revenue', 'status',
            'held_until', 'released_at',
            'commission_split', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'released_at', 'created_at']

    def get_commission_split(self, obj):
        split = obj.commission_splits.first()
        if not split:
            return None
        return CommissionSplitSerializer(split).data


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model"""
    
    booking_details = serializers.SerializerMethodField()
    escrow = EscrowAccountSerializer(read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'booking', 'booking_details', 'user',
            'amount', 'status', 'transaction_type',
            'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature',
            'escrow', 'description', 'metadata',
            'created_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'status', 'created_at', 'completed_at'
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
            'metadata', 'notes', 'created_at'
        ]
        read_only_fields = [
            'id', 'status', 'processed_at', 'razorpay_transfer_id',
            'created_at'
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
            'due_date', 'subtotal', 'tax_amount', 'platform_commission', 'total_amount',
            'pdf_generated', 'pdf_file', 'sent_to_guest', 'sent_to_host',
            'created_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'invoice_date', 'pdf_generated',
            'pdf_file', 'sent_to_guest', 'sent_to_host', 'created_at'
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
                'status': obj.booking.booking_status,
            }
        return None


class WebhookLogSerializer(serializers.ModelSerializer):
    """Serializer for WebhookLog model"""
    
    class Meta:
        model = WebhookLog
        fields = [
            'id', 'event', 'razorpay_webhook_id', 'payload',
            'processed', 'processing_error', 'received_at', 'processed_at'
        ]
        read_only_fields = [
            'id', 'received_at', 'processed_at'
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
