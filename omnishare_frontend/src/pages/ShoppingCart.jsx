import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './ShoppingCart.css';

const ShoppingCart = () => {
  const { items, total, count, removeItem, updateQuantity, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="shopping-cart">
        <div className="cart-empty">
          <h2>Your Cart is Empty</h2>
          <p>Start adding items to your cart to get started</p>
          <Link to="/" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shopping-cart">
      <div className="container">
        <h1>Shopping Cart</h1>
        
        <div className="cart-content">
          <div className="cart-items">
            <div className="cart-header">
              <span>Product</span>
              <span>Price</span>
              <span>Quantity</span>
              <span>Total</span>
              <span>Action</span>
            </div>

            {items.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-name">
                  <img 
                    src={item.image || 'https://via.placeholder.com/60'} 
                    alt={item.name}
                    className="item-image"
                  />
                  <div>
                    <h4>{item.name || item.title}</h4>
                    <p className="item-description">{item.description}</p>
                  </div>
                </div>

                <div className="item-price">₹{item.price}</div>

                <div className="item-quantity">
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>

                <div className="item-total">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </div>

                <button
                  className="btn-remove"
                  onClick={() => removeItem(item.id)}
                  title="Remove item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h3>Order Summary</h3>
            
            <div className="summary-row">
              <span>Subtotal ({count} items):</span>
              <span>₹{total.toFixed(2)}</span>
            </div>

            <div className="summary-row">
              <span>Shipping:</span>
              <span>FREE</span>
            </div>

            <div className="summary-row">
              <span>Tax (18%):</span>
              <span>₹{(total * 0.18).toFixed(2)}</span>
            </div>

            <div className="summary-divider"></div>

            <div className="summary-row summary-total">
              <span>Total Amount:</span>
              <span>₹{(total * 1.18).toFixed(2)}</span>
            </div>

            <button className="btn btn-primary btn-checkout">
              <Link to="/checkout" className="checkout-link">
                Proceed to Checkout
              </Link>
            </button>

            <button 
              className="btn btn-secondary"
              onClick={() => clearCart()}
            >
              Clear Cart
            </button>

            <Link to="/" className="continue-shopping">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;
