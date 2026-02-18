from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Booking
from listings.models import Listing
from listings.serializers import ListingSerializer

User = get_user_model()


class BookingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bookings"""
    
    class Meta:
        model = Booking
        fields = ['listing', 'start_date', 'end_date', 'insurance_fee']
    
    def validate(self, attrs):
        from .services import check_availability
        
        listing = attrs['listing']
        start_date = attrs['start_date']
        end_date = attrs['end_date']
        
        # Validate dates
        if end_date <= start_date:
            raise serializers.ValidationError({
                "end_date": "End date must be after start date"
            })
        
        # Check if listing is bookable
        if not listing.is_bookable():
            raise serializers.ValidationError({
                "listing": "This listing is not available for booking"
            })
        
        # Check guest permissions
        user = self.context['request'].user
        if not user.can_book():
            raise serializers.ValidationError(
                "You must complete KYC verification to make bookings"
            )
        
        # Check if guest is trying to book own listing
        if listing.host == user:
            raise serializers.ValidationError({
                "listing": "You cannot book your own listing"
            })
        
        # Check availability
        available, message = check_availability(listing, start_date, end_date)
        if not available:
            raise serializers.ValidationError({
                "dates": message
            })
        
        return attrs
    
    def create(self, validated_data):
        from .services import create_booking_with_lock
        
        guest = self.context['request'].user
        listing = validated_data['listing']
        start_date = validated_data['start_date']
        end_date = validated_data['end_date']
        insurance_fee = validated_data.get('insurance_fee', 0)
        
        booking = create_booking_with_lock(
            listing, guest, start_date, end_date, insurance_fee
        )
        
        return booking


class BookingSerializer(serializers.ModelSerializer):
    """Serializer for booking display"""
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    listing_image = serializers.SerializerMethodField()
    guest_name = serializers.CharField(source='guest.username', read_only=True)
    host_name = serializers.CharField(source='host.username', read_only=True)
    can_confirm = serializers.SerializerMethodField()
    can_handover = serializers.SerializerMethodField()
    can_return = serializers.SerializerMethodField()
    can_complete = serializers.SerializerMethodField()
    can_dispute = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = [
            'id', 'listing', 'listing_title', 'listing_image',
            'guest', 'guest_name', 'host', 'host_name',
            'start_date', 'end_date', 'rental_days',
            'daily_price', 'rental_amount', 'guest_total', 'host_payout',
            'deposit', 'insurance_fee', 'platform_commission',
            'booking_status', 'escrow_status', 'qr_code',
            'dispute_flag', 'created_at', 'confirmed_at',
            'can_confirm', 'can_handover', 'can_return',
            'can_complete', 'can_dispute', 'can_cancel'
        ]
        read_only_fields = ['id', 'rental_days', 'created_at']
    
    def get_listing_image(self, obj):
        primary = obj.listing.images.filter(is_primary=True).first()
        if not primary:
            primary = obj.listing.images.first()
        if primary:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary.image.url)
        return None
    
    def get_can_confirm(self, obj):
        return obj.can_confirm()
    
    def get_can_handover(self, obj):
        return obj.can_handover()
    
    def get_can_return(self, obj):
        return obj.can_return()
    
    def get_can_complete(self, obj):
        return obj.can_complete()
    
    def get_can_dispute(self, obj):
        return obj.can_dispute()
    
    def get_can_cancel(self, obj):
        return obj.can_cancel()


class BookingDetailSerializer(BookingSerializer):
    """Detailed booking serializer"""
    listing = ListingSerializer(read_only=True)
    
    class Meta(BookingSerializer.Meta):
        fields = BookingSerializer.Meta.fields + [
            'commission_host', 'commission_guest', 'handover_at',
            'return_at', 'completed_at', 'cancelled_at',
            'dispute_reason', 'dispute_resolution', 'cancellation_reason'
        ]


class DisputeSerializer(serializers.Serializer):
    """Serializer for raising disputes"""
    booking_id = serializers.IntegerField()
    reason = serializers.CharField(max_length=1000)


class DisputeResolutionSerializer(serializers.Serializer):
    """Serializer for admin dispute resolution"""
    booking_id = serializers.IntegerField()
    resolution = serializers.CharField(max_length=1000)
    refund_to_guest = serializers.BooleanField(default=False)


class CancellationSerializer(serializers.Serializer):
    """Serializer for booking cancellation"""
    booking_id = serializers.IntegerField()
    reason = serializers.CharField(max_length=500)


class QRVerificationSerializer(serializers.Serializer):
    """Serializer for QR code verification"""
    booking_id = serializers.IntegerField()
    qr_token = serializers.CharField(max_length=100)


class PriceCalculationSerializer(serializers.Serializer):
    """Serializer for price calculation"""
    listing_id = serializers.IntegerField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
