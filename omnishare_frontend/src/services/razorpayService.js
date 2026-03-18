import { paymentsAPI } from './api';

/**
 * Initialize Razorpay checkout for a booking
 * @param {number} bookingId - The booking ID to pay for
 * @param {string} userEmail - User's email for Razorpay receipt
 * @param {string} userPhone - User's phone for Razorpay contact
 * @param {function} onSuccess - Callback on successful payment
 * @param {function} onError - Callback on payment error
 */
export const initiateRazorpayPayment = async (
  bookingId,
  userEmail,
  userPhone,
  onSuccess,
  onError
) => {
  try {
    // Create payment order from backend
    const response = await paymentsAPI.createOrder({
      booking_id: bookingId,
      amount: null, // Backend will calculate from booking
    });

    const {
      order_id,
      amount,
      currency,
      booking_details,
    } = response.data;

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_SSYa8qxHpH3R2I',
      amount: amount,
      currency: currency || 'INR',
      order_id: order_id,
      name: 'OmniShare',
      description: `Booking for ${booking_details?.property_name || 'Property'}`,
      customer_id: `user_${booking_details?.guest_id}`,
      handler: async (response) => {
        // Verify and complete payment on backend
        try {
          const verifyResponse = await paymentsAPI.verifyPayment({
            order_id: order_id,
            payment_id: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            booking_id: bookingId,
          });

          if (verifyResponse.data.success) {
            if (onSuccess) onSuccess(verifyResponse.data);
          } else {
            throw new Error('Payment verification failed');
          }
        } catch (error) {
          if (onError) onError(error);
        }
      },
      prefill: {
        email: userEmail,
        contact: userPhone,
      },
      theme: {
        color: '#3b82f6', // Blue theme matching OmniShare
      },
      modal: {
        ondismiss: () => {
          if (onError) onError(new Error('Payment cancelled'));
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (error) {
    console.error('Razorpay payment initiation error:', error);
    if (onError) onError(error);
  }
};

/**
 * Create a payment order from backend
 * Used by initiateRazorpayPayment internally
 */
export const createPaymentOrder = async (bookingId, amount) => {
  return paymentsAPI.createOrder({
    booking_id: bookingId,
    amount: amount,
  });
};

/**
 * Verify Razorpay payment signature
 * Used by initiateRazorpayPayment internally
 */
export const verifyRazorpayPayment = async (paymentData) => {
  return paymentsAPI.verifyPayment(paymentData);
};
