"""
Razorpay integration utilities
"""
import razorpay
from django.conf import settings

def get_razorpay_client():
    """Initialize and return Razorpay client"""
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_razorpay_order(booking):
    """Create Razorpay order for booking payment"""
    client = get_razorpay_client()
    
    amount = int(float(booking.guest_total) * 100)  # Convert to paise
    
    order_data = {
        'amount': amount,
        'currency': 'INR',
        'receipt': f'booking_{booking.id}',
        'notes': {
            'booking_id': booking.id,
            'guest_id': booking.guest.id,
            'listing_id': booking.listing.id
        }
    }
    
    order = client.order.create(data=order_data)
    return order


def verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
    """Verify Razorpay payment signature"""
    client = get_razorpay_client()
    
    params_dict = {
        'razorpay_order_id': razorpay_order_id,
        'razorpay_payment_id': razorpay_payment_id,
        'razorpay_signature': razorpay_signature
    }
    
    try:
        client.utility.verify_payment_signature(params_dict)
        return True
    except razorpay.errors.SignatureVerificationError:
        return False


def initiate_refund(payment_id, amount):
    """Initiate refund for a payment"""
    client = get_razorpay_client()
    
    refund_amount = int(float(amount) * 100)  # Convert to paise
    
    refund = client.payment.refund(payment_id, refund_amount)
    return refund
