from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q

from .models import Category, Listing, ListingImage, Review
from .serializers import (
    CategorySerializer,
    ListingSerializer,
    ListingDetailSerializer,
    ListingCreateUpdateSerializer,
    ListingImageSerializer,
    ReviewSerializer,
    ListingVerificationSerializer
)
from users.permissions import IsVerifiedHost, IsAdmin, IsOwnerOrAdmin


class CategoryListView(generics.ListAPIView):
    """List all active categories"""
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


class ListingListView(generics.ListAPIView):
    """List all approved and available listings"""
    serializer_class = ListingSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['daily_price', 'rating', 'created_at']
    ordering = ['-promoted_flag', '-created_at']
    
    def get_queryset(self):
        queryset = Listing.objects.filter(
            verification_status='approved',
            is_available=True
        ).select_related('host', 'category').prefetch_related('images')
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)
        
        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(daily_price__gte=min_price)
        if max_price:
            queryset = queryset.filter(daily_price__lte=max_price)
        
        # Filter by location
        location = self.request.query_params.get('location')
        if location:
            queryset = queryset.filter(location__icontains=location)
        
        # Filter by minimum rating
        min_rating = self.request.query_params.get('min_rating')
        if min_rating:
            queryset = queryset.filter(rating__gte=min_rating)
        
        # Filter by gold host
        gold_host = self.request.query_params.get('gold_host')
        if gold_host == 'true':
            queryset = queryset.filter(host__gold_host_flag=True)
        
        return queryset


class ListingDetailView(generics.RetrieveAPIView):
    """Get detailed listing information"""
    queryset = Listing.objects.all()
    serializer_class = ListingDetailSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return super().get_queryset().select_related('host', 'category').prefetch_related('images', 'reviews')


class ListingCreateView(generics.CreateAPIView):
    """Create a new listing (verified hosts only)"""
    serializer_class = ListingCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsVerifiedHost]
    
    def perform_create(self, serializer):
        serializer.save(host=self.request.user)


class ListingUpdateView(generics.UpdateAPIView):
    """Update own listing"""
    serializer_class = ListingCreateUpdateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Listing.objects.filter(host=self.request.user)


class ListingDeleteView(generics.DestroyAPIView):
    """Delete own listing"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Listing.objects.filter(host=self.request.user)


class MyListingsView(generics.ListAPIView):
    """Get all listings by current user"""
    serializer_class = ListingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Listing.objects.filter(host=self.request.user).order_by('-created_at')


class ListingImageUploadView(generics.CreateAPIView):
    """Upload image for a listing"""
    serializer_class = ListingImageSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        listing_id = kwargs.get('listing_id')
        listing = get_object_or_404(Listing, id=listing_id, host=request.user)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # If this is marked as primary, unmark others
        if serializer.validated_data.get('is_primary', False):
            ListingImage.objects.filter(listing=listing, is_primary=True).update(is_primary=False)
        
        serializer.save(listing=listing)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PendingListingsView(generics.ListAPIView):
    """Admin view for pending listing verifications"""
    serializer_class = ListingDetailSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        return Listing.objects.filter(verification_status='pending').order_by('-created_at')


class VerifyListingView(generics.GenericAPIView):
    """Admin endpoint to verify/reject listings"""
    serializer_class = ListingVerificationSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        listing_id = serializer.validated_data['listing_id']
        verification_status = serializer.validated_data['status']
        remarks = serializer.validated_data.get('remarks', '')
        
        try:
            listing = Listing.objects.get(id=listing_id)
        except Listing.DoesNotExist:
            return Response({
                'error': 'Listing not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if listing.verification_status != 'pending':
            return Response({
                'error': 'Listing is not in pending status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        listing.verification_status = verification_status
        listing.verification_remarks = remarks
        listing.verified_by = request.user
        listing.verified_at = timezone.now()
        listing.save()
        
        return Response({
            'message': f'Listing {verification_status}',
            'listing': ListingDetailSerializer(listing, context={'request': request}).data
        }, status=status.HTTP_200_OK)


class PromotedListingsView(generics.ListAPIView):
    """List promoted listings"""
    serializer_class = ListingSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        now = timezone.now()
        return Listing.objects.filter(
            promoted_flag=True,
            promoted_until__gte=now,
            verification_status='approved',
            is_available=True
        ).order_by('-created_at')[:10]


class ReviewCreateView(generics.CreateAPIView):
    """Create a review for a completed booking"""
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(reviewer=self.request.user)


class ReviewListView(generics.ListAPIView):
    """List reviews for a listing"""
    serializer_class = ReviewSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        listing_id = self.kwargs.get('listing_id')
        return Review.objects.filter(listing_id=listing_id).order_by('-created_at')


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def promote_listing(request, listing_id):
    """Admin endpoint to promote a listing"""
    try:
        listing = Listing.objects.get(id=listing_id)
    except Listing.DoesNotExist:
        return Response({'error': 'Listing not found'}, status=status.HTTP_404_NOT_FOUND)
    
    days = request.data.get('days', 7)  # Default 7 days promotion
    
    listing.promoted_flag = True
    listing.promoted_until = timezone.now() + timezone.timedelta(days=days)
    listing.save()
    
    return Response({
        'message': f'Listing promoted for {days} days',
        'promoted_until': listing.promoted_until
    }, status=status.HTTP_200_OK)
