import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { bookingsAPI, paymentsAPI } from '../services/api';
import { toast } from 'react-toastify';
import './PaymentPage.css';

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const handledStripeSessionRef = useRef('');

  const [booking, setBooking] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState('demo');

  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        if (window.Razorpay) {
          resolve(true);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    const fetchData = async () => {
      setLoading(true);
      try {
        const [bookingRes, previewRes] = await Promise.all([
          bookingsAPI.getById(bookingId),
          paymentsAPI.checkoutPreview(bookingId),
        ]);
        setBooking(bookingRes.data);
        setPreview(previewRes.data);

        await loadRazorpayScript();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load payment details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bookingId]);

  useEffect(() => {
    const gatewayFromQuery = searchParams.get('gateway');
    if (gatewayFromQuery === 'stripe' || gatewayFromQuery === 'razorpay' || gatewayFromQuery === 'demo') {
      setSelectedGateway(gatewayFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    const stripeStatus = searchParams.get('stripe_status');
    const sessionId = searchParams.get('session_id');

    const verifyStripeReturn = async () => {
      if (stripeStatus !== 'success' || !sessionId || handledStripeSessionRef.current === sessionId) {
        return;
      }

      handledStripeSessionRef.current = sessionId;
      setProcessing(true);
      setError(null);
      try {
        const verifyRes = await paymentsAPI.verifyStripeSession({
          booking_id: bookingId,
          session_id: sessionId,
        });
        toast.success('Stripe payment successful');
        navigate(`/bookings/${bookingId}`, {
          state: {
            paymentSuccess: true,
            invoiceNumber: verifyRes?.data?.invoice_number,
          },
          replace: true,
        });
      } catch (err) {
        setError(err.response?.data?.error || 'Stripe payment verification failed');
      } finally {
        setProcessing(false);
      }
    };

    if (stripeStatus === 'cancelled') {
      setError('Stripe payment was cancelled. You can retry anytime.');
    } else {
      verifyStripeReturn();
    }
  }, [bookingId, navigate, searchParams]);

  const initiateRazorpayPayment = (order) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const options = {
      key: order.razorpay_key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: 'OmniShare',
      description: `Booking #${bookingId}`,
      handler: async (response) => {
        try {
          const verifyRes = await paymentsAPI.verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          toast.success('Payment successful');
          navigate(`/bookings/${bookingId}`, {
            state: {
              paymentSuccess: true,
              invoiceNumber: verifyRes?.data?.invoice_number,
            },
          });
        } catch (err) {
          setError(err.response?.data?.error || 'Payment verification failed');
        } finally {
          setProcessing(false);
        }
      },
      prefill: {
        name: user.username || '',
        email: user.email || '',
        contact: user.phone_number || '',
      },
      notes: {
        booking_id: bookingId,
        listing_id: booking?.listing?.id || booking?.listing,
      },
      theme: {
        color: '#3399cc',
      },
      modal: {
        ondismiss: () => {
          setProcessing(false);
          setError('Payment cancelled');
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handleCreateOrder = async () => {
    if (processing) return;
    setProcessing(true);
    setError(null);
    try {
      if (selectedGateway === 'demo') {
        const demoRes = await paymentsAPI.demoCompletePayment(bookingId);
        toast.success('Demo payment successful');
        navigate(`/bookings/${bookingId}`, {
          state: {
            paymentSuccess: true,
            invoiceNumber: demoRes?.data?.invoice_number,
          },
        });
        return;
      }

      if (selectedGateway === 'stripe') {
        const sessionRes = await paymentsAPI.createStripeSession(bookingId);
        const checkoutUrl = sessionRes?.data?.checkout_url;
        if (!checkoutUrl) {
          throw new Error('Stripe checkout URL not returned by server');
        }
        window.location.href = checkoutUrl;
        return;
      }

      const orderRes = await paymentsAPI.createOrder(bookingId);
      initiateRazorpayPayment(orderRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order');
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="payment-loading">Loading payment details...</div>;
  }

  if (!booking || !preview) {
    return <div className="payment-error">Booking not found</div>;
  }

  const amounts = preview.amounts || {};

  return (
    <div className="payment-container">
      <div className="payment-card">
        <h1>Complete Your Payment</h1>

        <div className="booking-summary">
          <h2>Booking Details</h2>
          <div className="summary-item">
            <span>Listing:</span>
            <strong>{preview.listing || booking.listing_title}</strong>
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

        <div className="price-breakdown">
          <h2>Price Breakdown</h2>
          <div className="breakdown-item">
            <span>Rental Amount:</span>
            <span>₹{amounts.rental_amount}</span>
          </div>
          <div className="breakdown-item">
            <span>Guest Commission:</span>
            <span>₹{amounts.commission_guest}</span>
          </div>
          <div className="breakdown-item">
            <span>Insurance Fee:</span>
            <span>₹{amounts.insurance_fee}</span>
          </div>
          <div className="breakdown-item">
            <span>Deposit:</span>
            <span>₹{amounts.deposit}</span>
          </div>
          <div className="breakdown-total">
            <span>Total Amount:</span>
            <strong>₹{amounts.guest_total}</strong>
          </div>
        </div>

        <div className="payment-info">
          <h3>Choose Payment Gateway</h3>
          <div className="gateway-selector">
            <button
              type="button"
              className={`gateway-chip ${selectedGateway === 'demo' ? 'active' : ''}`}
              onClick={() => setSelectedGateway('demo')}
              disabled={processing}
            >
              Instant Demo API
            </button>
            <button
              type="button"
              className={`gateway-chip ${selectedGateway === 'razorpay' ? 'active' : ''}`}
              onClick={() => setSelectedGateway('razorpay')}
              disabled={processing}
            >
              Razorpay Sandbox
            </button>
            <button
              type="button"
              className={`gateway-chip ${selectedGateway === 'stripe' ? 'active' : ''}`}
              onClick={() => setSelectedGateway('stripe')}
              disabled={processing}
            >
              Stripe Sandbox
            </button>
          </div>
          {selectedGateway === 'demo' ? (
            <p>Instantly marks payment successful for demonstration and generates invoice.</p>
          ) : selectedGateway === 'razorpay' ? (
            <p>Secure checkout via cards, UPI, wallets, and net banking.</p>
          ) : (
            <p>Stripe Checkout supports demo card testing and redirected confirmation.</p>
          )}
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        <div className="payment-actions">
          <button
            className="btn-pay"
            onClick={handleCreateOrder}
            disabled={processing || booking.booking_status !== 'pending'}
          >
            {processing
              ? 'Processing...'
              : `${selectedGateway === 'demo' ? 'Pay Instantly (Demo)' : selectedGateway === 'stripe' ? 'Pay with Stripe' : 'Pay with Razorpay'} ₹${amounts.guest_total || booking.guest_total}`}
          </button>
          <button className="btn-cancel" onClick={() => navigate(`/bookings/${bookingId}`)} disabled={processing}>
            Cancel
          </button>
        </div>

        {booking.booking_status !== 'pending' && (
          <p style={{ marginTop: '10px', color: '#6b7280' }}>
            This booking is no longer in pending state, so checkout is disabled.
          </p>
        )}
      </div>

      <div className="payment-help">
        <h3>Need Help?</h3>
        <p>If payment fails, retry from your booking page.</p>
        <p>Invoices are generated automatically after successful verification.</p>
      </div>
    </div>
  );
};

export default PaymentPage;
