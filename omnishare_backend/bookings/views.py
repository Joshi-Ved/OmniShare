from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Booking
from .serializers import (
    BookingCreateSerializer,
    BookingSerializer,
    BookingDetailSerializer,
    DisputeSerializer,
    DisputeResolutionSerializer,
    CancellationSerializer,
    QRVerificationSerializer,
    PriceCalculationSerializer
)
from .services import (
    get_blocked_dates,
    calculate_booking_price,
    verify_qr_code
)
from users.permissions import IsAdmin
from listings.models import Listing


class BookingCreateView(generics.CreateAPIView):
    """Create a new booking"""
    serializer_class = BookingCreateSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        
        return Response({
            'message': 'Booking created successfully',
            'booking': BookingSerializer(booking, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)


class MyBookingsView(generics.ListAPIView):
    """List all bookings for current user (as guest or host)"""
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        role = self.request.query_params.get('role', 'guest')
        
        if role == 'host':
            return Booking.objects.filter(host=user).order_by('-created_at')
        else:
            return Booking.objects.filter(guest=user).order_by('-created_at')


class BookingDetailView(generics.RetrieveAPIView):
    """Get detailed booking information"""
    serializer_class = BookingDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # User can only see their own bookings (as guest or host) or admin
        queryset = Booking.objects.filter(
            models.Q(guest=user) | models.Q(host=user)
        )
        if user.is_staff or user.role == 'admin':
            queryset = Booking.objects.all()
        return queryset


class ConfirmBookingView(generics.GenericAPIView):
    """Host confirms booking and payment is captured"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id, host=request.user)
        
        try:
            booking.confirm_booking()
            return Response({
                'message': 'Booking confirmed successfully',
                'booking': BookingSerializer(booking, context={'request': request}).data
            })
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class HandoverView(generics.GenericAPIView):
    """Mark handover complete (scan QR code)"""
    serializer_class = QRVerificationSerializer
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        booking_id = serializer.validated_data['booking_id']
        qr_token = serializer.validated_data['qr_token']
        
        valid, booking = verify_qr_code(booking_id, qr_token)
        
        if not valid:
            return Response({
                'error': 'Invalid QR code'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Only host can mark handover
        if booking.host != request.user:
            return Response({
                'error': 'Only host can mark handover'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            booking.mark_handover()
            return Response({
                'message': 'Handover completed successfully',
                'booking': BookingSerializer(booking, context={'request': request}).data
            })
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class ReturnView(generics.GenericAPIView):
    """Mark return complete (scan QR code)"""
    serializer_class = QRVerificationSerializer
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        booking_id = serializer.validated_data['booking_id']
        qr_token = serializer.validated_data['qr_token']
        
        valid, booking = verify_qr_code(booking_id, qr_token)
        
        if not valid:
            return Response({
                'error': 'Invalid QR code'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Only host can mark return
        if booking.host != request.user:
            return Response({
                'error': 'Only host can mark return'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            booking.mark_return()
            return Response({
                'message': 'Return completed successfully',
                'booking': BookingSerializer(booking, context={'request': request}).data
            })
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class CompleteBookingView(generics.GenericAPIView):
    """Mark booking as complete and release funds"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id, host=request.user)
        
        try:
            booking.complete_booking()
            return Response({
                'message': 'Booking completed successfully. Funds will be released.',
                'booking': BookingSerializer(booking, context={'request': request}).data
            })
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class RaiseDisputeView(generics.GenericAPIView):
    """Raise a dispute on booking"""
    serializer_class = DisputeSerializer
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        from django.db import models
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        booking_id = serializer.validated_data['booking_id']
        reason = serializer.validated_data['reason']
        
        booking = get_object_or_404(
            Booking,
            id=booking_id
        )
        
        # Only guest or host can raise dispute
        if request.user not in [booking.guest, booking.host]:
            return Response({
                'error': 'You are not authorized to raise dispute on this booking'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            booking.raise_dispute(request.user, reason)
            return Response({
                'message': 'Dispute raised successfully. Admin will review.',
                'booking': BookingSerializer(booking, context={'request': request}).data
            })
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class ResolveDisputeView(generics.GenericAPIView):
    """Admin resolves dispute"""
    serializer_class = DisputeResolutionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        booking_id = serializer.validated_data['booking_id']
        resolution = serializer.validated_data['resolution']
        refund_to_guest = serializer.validated_data['refund_to_guest']
        
        booking = get_object_or_404(Booking, id=booking_id)
        
        try:
            booking.resolve_dispute(resolution, refund_to_guest)
            return Response({
                'message': 'Dispute resolved successfully',
                'booking': BookingSerializer(booking, context={'request': request}).data
            })
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class CancelBookingView(generics.GenericAPIView):
    """Cancel a booking"""
    serializer_class = CancellationSerializer
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        from django.db import models
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        booking_id = serializer.validated_data['booking_id']
        reason = serializer.validated_data['reason']
        
        booking = get_object_or_404(
            Booking,
            id=booking_id
        )
        
        # Only guest or host can cancel
        if request.user not in [booking.guest, booking.host]:
            return Response({
                'error': 'You are not authorized to cancel this booking'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            booking.cancel_booking(request.user, reason)
            return Response({
                'message': 'Booking cancelled successfully',
                'booking': BookingSerializer(booking, context={'request': request}).data
            })
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class DisputedBookingsView(generics.ListAPIView):
    """Admin view for all disputed bookings"""
    serializer_class = BookingDetailSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        return Booking.objects.filter(
            booking_status='disputed',
            dispute_flag=True
        ).order_by('-dispute_raised_at')


class AdminBookingsView(generics.ListAPIView):
    """Admin view for booking order management with optional filters."""
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        dispute_only = self.request.query_params.get('dispute_only') == 'true'

        queryset = Booking.objects.select_related('listing', 'guest', 'host').order_by('-created_at')

        if status_filter:
            queryset = queryset.filter(booking_status=status_filter)

        if dispute_only:
            queryset = queryset.filter(dispute_flag=True)

        if search:
            search_filter = (
                Q(listing__title__icontains=search) |
                Q(guest__username__icontains=search) |
                Q(host__username__icontains=search)
            )
            if str(search).isdigit():
                search_filter = search_filter | Q(id=int(search))
            queryset = queryset.filter(search_filter)

        return queryset[:200]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_blocked_dates_view(request, listing_id):
    """Get blocked dates for a listing"""
    listing = get_object_or_404(Listing, id=listing_id)
    blocked_dates = get_blocked_dates(listing)
    
    return Response({
        'listing_id': listing_id,
        'blocked_dates': blocked_dates
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_price_view(request):
    """Calculate booking price before creating booking"""
    serializer = PriceCalculationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    listing_id = serializer.validated_data['listing_id']
    start_date = serializer.validated_data['start_date']
    end_date = serializer.validated_data['end_date']
    
    listing = get_object_or_404(Listing, id=listing_id)
    
    if end_date <= start_date:
        return Response({
            'error': 'End date must be after start date'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    price_breakdown = calculate_booking_price(listing, start_date, end_date)
    
    return Response(price_breakdown)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def booking_statistics(request):
    """Get booking statistics for admin dashboard"""
    from django.db.models import Count, Sum, Avg
    
    stats = {
        'total_bookings': Booking.objects.count(),
        'by_status': dict(
            Booking.objects.values('booking_status').annotate(
                count=Count('id')
            ).values_list('booking_status', 'count')
        ),
        'total_revenue': Booking.objects.filter(
            booking_status='completed'
        ).aggregate(
            total=Sum('platform_commission')
        )['total'] or 0,
        'disputed_count': Booking.objects.filter(dispute_flag=True).count(),
    }
    
    return Response(stats)
