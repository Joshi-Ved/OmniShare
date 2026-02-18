from rest_framework import generics, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone

from .serializers import (
    UserRegistrationSerializer,
    UserSerializer,
    KYCSubmissionSerializer,
    KYCVerificationSerializer,
    UserProfileUpdateSerializer,
    TrustScoreSerializer
)
from .permissions import IsOwnerOrAdmin, IsAdmin

User = get_user_model()


class UserRegistrationView(generics.CreateAPIView):
    """
    User registration endpoint
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get and update user profile
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserProfileUpdateSerializer
        return UserSerializer


class KYCSubmissionView(generics.UpdateAPIView):
    """
    Submit KYC document for verification
    """
    serializer_class = KYCSubmissionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        user = self.get_object()
        
        if user.kyc_status == 'verified':
            return Response({
                'error': 'Your KYC is already verified'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            'message': 'KYC document submitted successfully. Awaiting verification.',
            'kyc_status': 'pending'
        }, status=status.HTTP_200_OK)


class KYCVerificationView(generics.GenericAPIView):
    """
    Admin endpoint to verify/reject KYC
    """
    serializer_class = KYCVerificationSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_id = serializer.validated_data['user_id']
        kyc_status = serializer.validated_data['status']
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if user.kyc_status != 'pending':
            return Response({
                'error': 'KYC is not in pending status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user.kyc_status = kyc_status
        if kyc_status == 'verified':
            user.kyc_verified_at = timezone.now()
        
        user.save()
        
        return Response({
            'message': f'KYC {kyc_status} for user {user.username}',
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class PendingKYCListView(generics.ListAPIView):
    """
    Admin endpoint to list all pending KYC submissions
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        return User.objects.filter(kyc_status='pending').order_by('-kyc_submitted_at')


class TrustScoreView(generics.RetrieveAPIView):
    """
    Get user's trust score details
    """
    serializer_class = TrustScoreSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        user_id = self.kwargs.get('user_id')
        if user_id:
            return User.objects.get(id=user_id)
        return self.request.user


class GoldHostListView(generics.ListAPIView):
    """
    List all Gold Hosts
    """
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return User.objects.filter(gold_host_flag=True).order_by('-trust_score')


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def force_update_trust_scores(request):
    """
    Admin endpoint to recalculate all trust scores
    """
    users = User.objects.all()
    count = 0
    
    for user in users:
        user.update_trust_score()
        user.check_gold_host_eligibility()
        count += 1
    
    return Response({
        'message': f'Trust scores updated for {count} users'
    }, status=status.HTTP_200_OK)
