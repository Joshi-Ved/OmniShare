import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './OrderConfirmation.css';

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order;

  if (!order) {
    return (
      <div className="order-confirmation">
        <div className="confirmation-container">
          <div className="confirmation-error">
            <h2>Order Not Found</h2>
            <p>We couldn't find your order details.</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/')}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-confirmation">
      <div className="confirmation-container">
        <div className="confirmation-header">
          <div className="success-icon">✓</div>
          <h1>Order Confirmed!</h1>
          <p>Thank you for your purchase</p>
        </div>

        <div className="confirmation-card">
          <div className="confirmation-section">
            <h3>Order Details</h3>
            <div className="detail-row">
              <span>Order Number:</span>
              <strong>{order.order_number}</strong>
            </div>
            <div className="detail-row">
              <span>Date & Time:</span>
              <strong>{new Date(order.timestamp).toLocaleString()}</strong>
            </div>
            <div className="detail-row">
              <span>Payment Method:</span>
              <strong>{order.paymentMethod === 'demo' ? 'Demo Payment' : 'Razorpay'}</strong>
            </div>
            {order.payment_id && (
              <div className="detail-row">
                <span>Payment ID:</span>
                <strong>{order.payment_id.slice(0, 20)}...</strong>
              </div>
            )}
          </div>

          <div className="confirmation-section">
            <h3>Items</h3>
            <div className="items-list">
              {order.items.map((item, index) => (
                <div key={index} className="confirmation-item">
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    <p>Quantity: {item.quantity} × ₹{item.price}</p>
                  </div>
                  <div className="item-total">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="confirmation-section">
            <h3>Delivery Address</h3>
            <div className="address-display">
              <p>
                <strong>{order.deliveryAddress.firstName} {order.deliveryAddress.lastName}</strong><br />
                {order.deliveryAddress.address}<br />
                {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipcode}<br />
                <strong>Phone:</strong> {order.deliveryAddress.phone}<br />
                <strong>Email:</strong> {order.deliveryAddress.email}
              </p>
            </div>
          </div>

          <div className="confirmation-section">
            <h3>Price Summary</h3>
            <div className="summary-details">
              <div className="summary-row">
                <span>Subtotal ({order.items.length} items):</span>
                <span>₹{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax (18%):</span>
                <span>₹{order.tax.toFixed(2)}</span>
              </div>
              <div className="summary-row summary-total">
                <span>Total Amount Paid:</span>
                <span>₹{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="confirmation-actions">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/')}
            >
              Continue Shopping
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => window.print()}
            >
              Print Order
            </button>
          </div>
        </div>

        <div className="confirmation-message">
          <p>📧 A confirmation email has been sent to <strong>{order.deliveryAddress.email}</strong></p>
          <p>📦 You will receive your order within 5-7 business days</p>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
