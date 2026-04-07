from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Category, Listing, ListingImage, Review

User = get_user_model()


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for categories"""
    listing_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'listing_count']
    
    def get_listing_count(self, obj):
        return obj.listings.filter(verification_status='approved', is_available=True).count()


class ListingImageSerializer(serializers.ModelSerializer):
    """Serializer for listing images"""
    image = serializers.SerializerMethodField()
    
    class Meta:
        model = ListingImage
        fields = ['id', 'image', 'caption', 'is_primary', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']
    
    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None


class HostSerializer(serializers.ModelSerializer):
    """Minimal host info for listing display"""
    class Meta:
        model = User
        fields = ['id', 'username', 'trust_score', 'gold_host_flag', 'successful_bookings']


class ListingSerializer(serializers.ModelSerializer):
    """Serializer for listing list view"""
    host = HostSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    primary_image = serializers.SerializerMethodField()
    is_bookable = serializers.SerializerMethodField()
    
    class Meta:
        model = Listing
        fields = [
            'id', 'host', 'title', 'description', 'category', 'category_name',
            'daily_price', 'deposit', 'insurance_plan', 'location', 'rating', 'total_reviews',
            'promoted_flag', 'primary_image', 'is_bookable', 'created_at'
        ]
        read_only_fields = ['id', 'host', 'rating', 'total_reviews', 'created_at']
    
    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first()
        if not primary:
            primary = obj.images.first()
        if primary:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary.image.url)
        return None
    
    def get_is_bookable(self, obj):
        return obj.is_bookable()


class ListingDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single listing view"""
    host = HostSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = ListingImageSerializer(many=True, read_only=True)
    is_bookable = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    
    class Meta:
        model = Listing
        fields = [
            'id', 'host', 'title', 'description', 'category', 'category_name',
            'daily_price', 'deposit', 'insurance_plan', 'location', 'address', 'latitude', 'longitude',
            'availability_start', 'availability_end', 'is_available',
            'verification_status', 'rating', 'total_reviews', 'total_bookings',
            'promoted_flag', 'images', 'is_bookable', 'is_owner', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'host', 'verification_status', 'rating', 'total_reviews',
            'total_bookings', 'created_at', 'updated_at'
        ]
    
    def get_is_bookable(self, obj):
        return obj.is_bookable()
    
    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.host == request.user
        return False


class ListingCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating listings"""
    
    class Meta:
        model = Listing
        fields = [
            'title', 'description', 'category', 'daily_price', 'deposit', 'insurance_plan',
            'location', 'address', 'latitude', 'longitude',
            'availability_start', 'availability_end', 'is_available'
        ]
    
    def validate(self, attrs):
        if attrs.get('availability_end') and attrs.get('availability_start'):
            if attrs['availability_end'] <= attrs['availability_start']:
                raise serializers.ValidationError({
                    "availability_end": "End date must be after start date."
                })
        
        if attrs.get('daily_price') and attrs['daily_price'] <= 0:
            raise serializers.ValidationError({
                "daily_price": "Price must be greater than zero."
            })
        
        return attrs
    
    def create(self, validated_data):
        validated_data['host'] = self.context['request'].user
        validated_data['verification_status'] = 'pending'
        return super().create(validated_data)


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for reviews"""
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True)
    reviewer_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Review
        fields = [
            'id', 'listing', 'booking', 'reviewer', 'reviewer_name', 'reviewer_image',
            'rating', 'comment', 'cleanliness_rating', 'accuracy_rating', 'value_rating',
            'created_at'
        ]
        read_only_fields = ['id', 'reviewer', 'created_at']
    
    def get_reviewer_image(self, obj):
        if obj.reviewer.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.reviewer.profile_image.url)
        return None
    
    def validate(self, attrs):
        # Ensure booking exists and belongs to reviewer
        booking = attrs.get('booking')
        request = self.context.get('request')
        
        if booking.guest != request.user:
            raise serializers.ValidationError("You can only review your own bookings.")
        
        if booking.booking_status != 'completed':
            raise serializers.ValidationError("You can only review completed bookings.")
        
        # Check if review already exists
        if Review.objects.filter(booking=booking).exists():
            raise serializers.ValidationError("Review already exists for this booking.")
        
        return attrs


class ListingVerificationSerializer(serializers.Serializer):
    """Serializer for admin listing verification"""
    listing_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=['approved', 'rejected'])
    remarks = serializers.CharField(required=False, allow_blank=True)
