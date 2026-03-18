import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { useCart } from '../context/CartContext';
import { toast } from 'react-toastify';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user: clerkUser } = useAuth();
  const { items, total, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState('demo');
  const [formData, setFormData] = useState({
    firstName: clerkUser?.firstName || '',
    lastName: clerkUser?.lastName || '',
    email: clerkUser?.primaryEmailAddress?.emailAddress || '',
    phone: clerkUser?.phoneNumbers?.[0]?.phoneNumber || '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
  });

  const taxAmount = total * 0.18;
  const finalAmount = total + taxAmount;

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!formData.address || !formData.city || !formData.state || !formData.zipcode) {
      toast.error('Please fill all delivery address fields');
      return;
    }

    setLoading(true);

    try {
      if (selectedGateway === 'demo') {
        // Demo payment - instant success
        const orderData = {
          items: items.map(item => ({
            id: item.id,
            name: item.name || item.title,
            quantity: item.quantity,
            price: item.price,
          })),
          total: finalAmount,
          tax: taxAmount,
          subtotal: total,
          deliveryAddress: formData,
          paymentMethod: 'demo',
          status: 'confirmed',
          order_number: `ORD-${Date.now()}`,
          timestamp: new Date().toISOString(),
        };

        // Save order to localStorage
        const orders = JSON.parse(localStorage.getItem('omnishare_orders') || '[]');
        orders.push(orderData);
        localStorage.setItem('omnishare_orders', JSON.stringify(orders));

        toast.success('Demo Order Placed Successfully! 🎉');
        clearCart();
        
        // Show order confirmation
        navigate('/order-confirmation', {
          state: { order: orderData },
          replace: true,
        });
      } else if (selectedGateway === 'razorpay') {
        // Real Razorpay payment
        handleRazorpayPayment();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayPayment = () => {
    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_SSYa8qxHpH3R2I',
      amount: Math.round(finalAmount * 100), // Convert to paise
      currency: 'INR',
      name: 'OmniShare',
      description: `Shopping Cart Order - ${items.length} items`,
      handler: async (response) => {
        try {
          // Save order on successful payment
          const orderData = {
            items: items.map(item => ({
              id: item.id,
              name: item.name || item.title,
              quantity: item.quantity,
              price: item.price,
            })),
            total: finalAmount,
            tax: taxAmount,
            subtotal: total,
            deliveryAddress: formData,
            paymentMethod: 'razorpay',
            status: 'confirmed',
            order_number: `ORD-${Date.now()}`,
            payment_id: response.razorpay_payment_id,
            timestamp: new Date().toISOString(),
          };

          const orders = JSON.parse(localStorage.getItem('omnishare_orders') || '[]');
          orders.push(orderData);
          localStorage.setItem('omnishare_orders', JSON.stringify(orders));

          toast.success('Payment Successful! Order Confirmed 🎉');
          clearCart();

          navigate('/order-confirmation', {
            state: { order: orderData },
            replace: true,
          });
        } catch (error) {
          toast.error('Order confirmation failed');
        }
      },
      prefill: {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        contact: formData.phone,
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
  };

  if (items.length === 0) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="checkout-empty">
            <h2>Your Cart is Empty</h2>
            <p>Add items to your cart before proceeding to checkout.</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/')}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <h1>Checkout</h1>

        <div className="checkout-content">
          {/* Order Summary */}
          <div className="checkout-section">
            <h2>Order Summary</h2>
            <div className="order-items">
              {items.map((item) => (
                <div key={item.id} className="order-item">
                  <div className="order-item-info">
                    <h4>{item.name || item.title}</h4>
                    <p className="order-item-qty">Qty: {item.quantity}</p>
                  </div>
                  <div className="order-item-price">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="order-totals">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Tax (18%):</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="total-row total-final">
                <span>Total Amount:</span>
                <span>₹{finalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="checkout-section">
            <h2>Delivery Address</h2>
            <form className="address-form">
              <div className="form-row">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-row">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <textarea
                name="address"
                placeholder="Street Address"
                value={formData.address}
                onChange={handleFormChange}
                rows="3"
                required
              />

              <div className="form-row">
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="text"
                  name="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="text"
                  name="zipcode"
                  placeholder="Zip Code"
                  value={formData.zipcode}
                  onChange={handleFormChange}
                  required
                />
              </div>
            </form>
          </div>

          {/* Payment Method */}
          <div className="checkout-section">
            <h2>Payment Method</h2>
            <div className="payment-methods">
              <label className="payment-option">
                <input
                  type="radio"
                  value="demo"
                  checked={selectedGateway === 'demo'}
                  onChange={(e) => setSelectedGateway(e.target.value)}
                />
                <div className="payment-option-content">
                  <strong>Instant Demo Payment</strong>
                  <p>Instantly marks order as confirmed for demonstration</p>
                </div>
              </label>

              <label className="payment-option">
                <input
                  type="radio"
                  value="razorpay"
                  checked={selectedGateway === 'razorpay'}
                  onChange={(e) => setSelectedGateway(e.target.value)}
                />
                <div className="payment-option-content">
                  <strong>Razorpay</strong>
                  <p>Secure payment via Razorpay (Test cards available)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            className="btn btn-primary btn-checkout-submit"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? 'Processing...' : `Confirm Order - ₹${finalAmount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
