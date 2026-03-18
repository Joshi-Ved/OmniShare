import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { paymentsAPI } from '../services/api';
import { useAuth } from '@clerk/react';
import './RazorpayPaymentModal.css';

const RazorpayPaymentModal = ({
  isOpen,
  bookingId,
  amount,
  bookingDetails,
  onClose,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    if (isOpen && bookingId && !orderData) {
      fetchOrderData();
    }
  }, [isOpen, bookingId]);

  const fetchOrderData = async () => {
    try {
      setLoading(true);
      const response = await paymentsAPI.checkoutPreview(bookingId);
      setOrderData(response.data);
    } catch (error) {
      console.error('Failed to fetch order data:', error);
      toast.error('Failed to load payment details');
      onPaymentError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error('You must be logged in to make a payment');
      return;
    }

    try {
      setLoading(true);

      // Create order from backend
      const orderResponse = await paymentsAPI.createOrder(bookingId);
      const { order_id, amount: orderAmount, currency } = orderResponse.data;

      // Initialize Razorpay
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_SSYa8qxHpH3R2I',
        amount: orderAmount,
        currency: currency || 'INR',
        order_id: order_id,
        name: 'OmniShare',
        description: `Booking Payment - ${bookingDetails?.property_name || 'Property Rental'}`,
        customer_id: `user_${user.id}`,
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await paymentsAPI.verifyPayment({
              razorpay_order_id: order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyResponse.data.success || verifyResponse.status === 200) {
              toast.success('Payment successful!');
              onPaymentSuccess?.(verifyResponse.data);
              onClose();
            } else {
              toast.error('Payment verification failed');
              onPaymentError?.(new Error('Payment verification failed'));
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed');
            onPaymentError?.(error);
          }
        },
        prefill: {
          email: user.primaryEmailAddress?.emailAddress || '',
          contact: user.phoneNumbers?.[0]?.phoneNumber || '',
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        },
        theme: {
          color: '#3b82f6',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast.info('Payment cancelled');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error('Failed to initiate payment');
      onPaymentError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPayment = async () => {
    try {
      setLoading(true);
      const response = await paymentsAPI.demoCompletePayment(bookingId);
      toast.success('Demo payment completed!');
      onPaymentSuccess?.(response.data);
      onClose();
    } catch (error) {
      console.error('Demo payment error:', error);
      toast.error('Demo payment failed');
      onPaymentError?.(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="razorpay-modal-overlay" onClick={onClose}>
      <div className="razorpay-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="razorpay-modal-header">
          <h2>Complete Payment</h2>
          <button
            className="razorpay-modal-close"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {loading && !orderData ? (
          <div className="razorpay-modal-body">
            <div className="razorpay-loading">Loading payment details...</div>
          </div>
        ) : orderData ? (
          <div className="razorpay-modal-body">
            <div className="razorpay-booking-details">
              <h3>{orderData.listing}</h3>
              <div className="razorpay-date-range">
                <p>
                  <strong>Dates:</strong> {orderData.date_range.start_date} to{' '}
                  {orderData.date_range.end_date}
                </p>
                <p>
                  <strong>Days:</strong> {orderData.date_range.rental_days}
                </p>
              </div>
            </div>

            <div className="razorpay-amounts">
              <div className="razorpay-amount-row">
                <span>Rental Amount:</span>
                <span>₹{orderData.amounts.rental_amount}</span>
              </div>
              <div className="razorpay-amount-row">
                <span>Deposit:</span>
                <span>₹{orderData.amounts.deposit}</span>
              </div>
              <div className="razorpay-amount-row">
                <span>Insurance Fee:</span>
                <span>₹{orderData.amounts.insurance_fee}</span>
              </div>
              <div className="razorpay-amount-row">
                <span>Commission:</span>
                <span>₹{orderData.amounts.commission_guest}</span>
              </div>
              <div className="razorpay-amount-row razorpay-total">
                <strong>Total To Pay:</strong>
                <strong>₹{orderData.amounts.guest_total}</strong>
              </div>
            </div>

            <div className="razorpay-modal-footer">
              <button
                className="razorpay-btn razorpay-btn-primary"
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Pay with Razorpay'}
              </button>
              <button
                className="razorpay-btn razorpay-btn-secondary"
                onClick={handleDemoPayment}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Demo Payment'}
              </button>
              <button
                className="razorpay-btn razorpay-btn-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default RazorpayPaymentModal;
