from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'phone_number', 'role']
        extra_kwargs = {
            'email': {'required': True},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        if attrs.get('role') not in ['guest', 'host', 'both']:
            raise serializers.ValidationError({"role": "Invalid role. Choose 'guest', 'host', or 'both'."})
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile"""
    can_create_listing = serializers.SerializerMethodField()
    can_book = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone_number', 'profile_image',
            'role', 'kyc_status', 'trust_score', 'total_bookings',
            'successful_bookings', 'gold_host_flag', 'gold_host_since',
            'created_at', 'can_create_listing', 'can_book'
        ]
        read_only_fields = [
            'id', 'trust_score', 'total_bookings', 'successful_bookings',
            'gold_host_flag', 'gold_host_since', 'created_at'
        ]
    
    def get_can_create_listing(self, obj):
        return obj.can_create_listing()
    
    def get_can_book(self, obj):
        return obj.can_book()


class KYCSubmissionSerializer(serializers.ModelSerializer):
    """Serializer for KYC document submission"""
    class Meta:
        model = User
        fields = ['kyc_document']
    
    def update(self, instance, validated_data):
        from django.utils import timezone
        instance.kyc_document = validated_data.get('kyc_document', instance.kyc_document)
        instance.kyc_status = 'pending'
        instance.kyc_submitted_at = timezone.now()
        instance.save()
        return instance


class KYCVerificationSerializer(serializers.Serializer):
    """Serializer for admin KYC verification"""
    user_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=['verified', 'rejected'])
    remarks = serializers.CharField(required=False, allow_blank=True)


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    class Meta:
        model = User
        fields = ['username', 'phone_number', 'profile_image', 'role']
    
    def validate_role(self, value):
        if value == 'admin':
            raise serializers.ValidationError("Cannot set role to admin.")
        return value


class TrustScoreSerializer(serializers.ModelSerializer):
    """Serializer for displaying trust score details"""
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'trust_score', 'total_bookings', 'successful_bookings',
            'cancelled_bookings', 'disputed_bookings', 'success_rate'
        ]
    
    def get_success_rate(self, obj):
        if obj.total_bookings == 0:
            return 0
        return round((obj.successful_bookings / obj.total_bookings) * 100, 2)
