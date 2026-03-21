import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useClerk, useUser } from '@clerk/react';
import { useCart } from '../context/CartContext';
import './Navbar.css';

const Navbar = ({ isDark, onToggleTheme }) => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { count: cartCount } = useCart();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setMobileOpen(false);
    navigate('/clerk/sign-in');
  };

  return (
    <nav className="navbar">
      <div className="container-lg">
        <div className="navbar-content">
          <Link to="/" className="logo">
            OmniShare
          </Link>

          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>

          <div className={`nav-menu ${mobileOpen ? 'open' : ''}`}>
            <Link to="/" className="nav-link">Explore</Link>

            <button
              type="button"
              className="theme-toggle"
              onClick={onToggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
              title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            >
              {isDark ? 'Light' : 'Dark'}
            </button>
            
            <Link to="/cart" className="nav-link cart-link">
              🛒 Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>
            
            {isSignedIn ? (
              <>
                <Link to="/profile" className="nav-link">Profile</Link>

                {(user.role === 'host' || user.role === 'both') && (
                  <Link to="/host/dashboard" className="nav-link">Host</Link>
                )}
                
                {(user.role === 'guest' || user.role === 'both') && (
                  <Link to="/guest/dashboard" className="nav-link">Bookings</Link>
                )}
                
                {(user.role === 'admin' || user.is_staff) && (
                  <Link to="/admin/dashboard" className="nav-link admin-link">Admin</Link>
                )}
                
                <div className="nav-user">
                  <span className="user-name">{clerkUser?.firstName || clerkUser?.username || user.username?.split('@')[0]}</span>
                  {user.gold_host_flag && <span className="badge badge-warning">⭐</span>}
                </div>
                
                <button onClick={handleLogout} className="btn btn-primary">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/clerk/sign-in" className="btn btn-primary">
                  Login
                </Link>
                <Link to="/clerk/sign-up" className="btn btn-secondary">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
