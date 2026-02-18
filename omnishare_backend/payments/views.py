from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Transaction
from .razorpay_utils import create_razorpay_order, verify_payment_signature
from bookings.models import Booking


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request, booking_id):
    """Create Razorpay order for booking payment"""
    booking = get_object_or_404(Booking, id=booking_id, guest=request.user)
    
    if booking.booking_status != 'pending':
        return Response({
            'error': 'Booking is not in pending state'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        order = create_razorpay_order(booking)
        
        return Response({
            'order_id': order['id'],
            'amount': order['amount'],
            'currency': order['currency'],
            'razorpay_key': settings.RAZORPAY_KEY_ID
        })
    except Exception as e:
        return Response({
            'error': f'Failed to create order: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """Verify payment and confirm booking"""
    razorpay_order_id = request.data.get('razorpay_order_id')
    razorpay_payment_id = request.data.get('razorpay_payment_id')
    razorpay_signature = request.data.get('razorpay_signature')
    booking_id = request.data.get('booking_id')
    
    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id]):
        return Response({
            'error': 'Missing required fields'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    booking = get_object_or_404(Booking, id=booking_id, guest=request.user)
    
    # Verify signature
    is_valid = verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    
    if not is_valid:
        return Response({
            'error': 'Invalid payment signature'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create transaction record
    transaction = Transaction.objects.create(
        booking=booking,
        user=request.user,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_order_id=razorpay_order_id,
        razorpay_signature=razorpay_signature,
        transaction_type='booking_payment',
        amount=booking.guest_total,
        status='success',
        completed_at=timezone.now()
    )
    
    # Confirm booking
    booking.confirm_booking()
    
    return Response({
        'message': 'Payment verified and booking confirmed',
        'transaction_id': transaction.id,
        'booking_status': booking.booking_status
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transaction_history(request):
    """Get user's transaction history"""
    transactions = Transaction.objects.filter(user=request.user).order_by('-created_at')
    
    data = []
    for txn in transactions:
        data.append({
            'id': txn.id,
            'booking_id': txn.booking.id,
            'type': txn.transaction_type,
            'amount': float(txn.amount),
            'status': txn.status,
            'created_at': txn.created_at,
            'razorpay_payment_id': txn.razorpay_payment_id
        })
    
    return Response(data)
