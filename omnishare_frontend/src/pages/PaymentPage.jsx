import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './PaymentPage.css';

// Razorpay script should be loaded in public/index.html:
// <script src="https://checkout.razorpay.com/v1/checkout.js"></script>

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);

  // Load booking details
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(
          `http://localhost:8001/api/bookings/${bookingId}/`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setBooking(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load booking details');
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  // Create payment order
  const handleCreateOrder = async () => {
    try {
      setProcessing(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        'http://localhost:8001/api/payments/create-order/',
        { booking_id: bookingId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setOrderData(response.data);
      
      // Open Razorpay modal
      initiateRazorpayPayment(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order');
      setProcessing(false);
    }
  };

  // Handle Razorpay payment
  const initiateRazorpayPayment = (order) => {
    const options = {
      key: order.razorpay_key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: 'OmniShare',
      description: `Booking for ${booking?.listing?.title || 'Property'}`,
      image: '/logo.png', // Add your logo
      
      handler: async (response) => {
        try {
          // Verify payment on backend
          const token = localStorage.getItem('access_token');
          const verifyResponse = await axios.post(
            'http://localhost:8001/api/payments/verify/',
            {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          // Payment successful
          alert('Payment successful!');
          navigate(`/booking/${bookingId}/confirmation`);
        } catch (err) {
          setError('Payment verification failed. Please contact support.');
          console.error('Verification error:', err);
        }
      },

      prefill: {
        name: booking?.guest?.first_name + ' ' + booking?.guest?.last_name,
        email: booking?.guest?.email,
        contact: booking?.guest?.phone_number || ''
      },

      notes: {
        booking_id: bookingId,
        listing_id: booking?.listing?.id
      },

      theme: {
        color: '#3399cc'
      },

      modal: {
        ondismiss: () => {
          setProcessing(false);
          setError('Payment cancelled');
        }
      },

      timeout: 30 * 60, // 30 minutes
      redirect: false
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (loading) {
    return <div className="payment-loading">Loading booking details...</div>;
  }

  if (!booking) {
    return <div className="payment-error">Booking not found</div>;
  }

  return (
    <div className="payment-container">
      <div className="payment-card">
        <h1>Complete Your Payment</h1>
        
        {/* Booking Summary */}
        <div className="booking-summary">
          <h2>Booking Details</h2>
          <div className="summary-item">
            <span>Listing:</span>
            <strong>{booking.listing?.title}</strong>
          </div>
          <div className="summary-item">
            <span>Check-in:</span>
            <strong>{new Date(booking.start_date).toLocaleDateString()}</strong>
          </div>
          <div className="summary-item">
            <span>Check-out:</span>
            <strong>{new Date(booking.end_date).toLocaleDateString()}</strong>
          </div>
          <div className="summary-item">
            <span>Nights:</span>
            <strong>{booking.rental_days}</strong>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="price-breakdown">
          <h2>Price Breakdown</h2>
          <div className="breakdown-item">
            <span>Rental Amount ({booking.rental_days} nights × ₹{booking.daily_price}):</span>
            <span>₹{booking.rental_amount}</span>
          </div>
          <div className="breakdown-item">
            <span>Guest Commission (6%):</span>
            <span>₹{booking.commission_guest}</span>
          </div>
          <div className="breakdown-item">
            <span>Insurance Fee:</span>
            <span>₹{booking.insurance_fee}</span>
          </div>
          <div className="breakdown-item">
            <span>Deposit (Refundable):</span>
            <span>₹{booking.deposit}</span>
          </div>
          <div className="breakdown-total">
            <span>Total Amount:</span>
            <strong>₹{booking.guest_total}</strong>
          </div>
        </div>

        {/* Payment Method Info */}
        <div className="payment-info">
          <h3>Payment Method: Razorpay</h3>
          <p>You will be redirected to Razorpay's secure payment gateway.</p>
          <p>Accepted: Credit/Debit Cards, UPI, Wallets, Net Banking</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="payment-actions">
          <button
            className="btn-pay"
            onClick={handleCreateOrder}
            disabled={processing}
          >
            {processing ? 'Processing...' : `Pay ₹${booking.guest_total}`}
          </button>
          <button
            className="btn-cancel"
            onClick={() => navigate(`/booking/${bookingId}`)}
            disabled={processing}
          >
            Cancel
          </button>
        </div>

        {/* Security Info */}
        <div className="security-info">
          <p>✓ Secure payment powered by Razorpay</p>
          <p>✓ Your payment information is encrypted</p>
          <p>✓ Money held in escrow until booking completion</p>
        </div>
      </div>

      {/* Help Section */}
      <div className="payment-help">
        <h3>Need Help?</h3>
        <p>If you face any payment issues, please contact our support team.</p>
        <p>Email: support@omnishare.com</p>
      </div>
    </div>
  );
};

export default PaymentPage;
