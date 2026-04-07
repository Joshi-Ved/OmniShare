import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useClerk, useUser } from '@clerk/react';
import { useCart } from '../context/CartContext';
import { authAPI, notificationsAPI } from '../services/api';
import './Navbar.css';

const BellIcon = () => (
  <svg viewBox="0 0 24 24" className="icon-sm" aria-hidden="true">
    <path d="M12 3a5 5 0 0 0-5 5v2.4c0 .9-.3 1.8-.9 2.5L4.6 15a1 1 0 0 0 .8 1.6h13.2a1 1 0 0 0 .8-1.6l-1.5-2.1c-.6-.7-.9-1.6-.9-2.5V8a5 5 0 0 0-5-5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 18a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const CoinIcon = () => (
  <svg viewBox="0 0 24 24" className="icon-sm" aria-hidden="true">
    <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);

const Navbar = ({ isDark, onToggleTheme }) => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { count: cartCount } = useCart();
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const panelRef = useRef(null);
  const user = profile || {};

  useEffect(() => {
    const loadRetentionData = async () => {
      if (!isSignedIn) {
        setNotifications([]);
        setProfile(JSON.parse(localStorage.getItem('user') || '{}'));
        return;
      }

      try {
        const existingToken = localStorage.getItem('access_token');
        if (!existingToken) {
          const email =
            clerkUser?.primaryEmailAddress?.emailAddress ||
            clerkUser?.emailAddresses?.[0]?.emailAddress ||
            '';

          if (email) {
            const syncResponse = await authAPI.clerkSyncLogin({
              email,
              username: clerkUser?.username || clerkUser?.id || email,
              first_name: clerkUser?.firstName || '',
              last_name: clerkUser?.lastName || '',
            });

            if (syncResponse?.data?.access_token) {
              localStorage.setItem('access_token', syncResponse.data.access_token);
            }

            if (syncResponse?.data?.user) {
              localStorage.setItem('user', JSON.stringify(syncResponse.data.user));
            }
          }
        }

        const [profileResponse, notificationsResponse] = await Promise.all([
          authAPI.getProfile(),
          notificationsAPI.getAll(),
        ]);

        const freshProfile = profileResponse.data || {};
        setProfile(freshProfile);
        localStorage.setItem('user', JSON.stringify({
          ...(JSON.parse(localStorage.getItem('user') || '{}')),
          ...freshProfile,
        }));

        const notificationData = notificationsResponse.data?.results || notificationsResponse.data || [];
        setNotifications(Array.isArray(notificationData) ? notificationData : []);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    loadRetentionData();
  }, [isSignedIn, clerkUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      window.addEventListener('mousedown', handleClickOutside);
      return () => window.removeEventListener('mousedown', handleClickOutside);
    }

    return undefined;
  }, [showNotifications]);

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setMobileOpen(false);
    navigate('/clerk/sign-in');
  };

  const handleNavigate = (path) => {
    setMobileOpen(false);
    setShowNotifications(false);
    navigate(path);
  };

  const unreadCount = notifications.filter((item) => !item.is_read).length;

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
            <Link to="/" className="nav-link" onClick={() => setMobileOpen(false)}>Explore</Link>
            <Link to="/demo/customer" className="nav-link" onClick={() => setMobileOpen(false)}>Customer Demo</Link>
            <Link to="/demo/admin" className="nav-link" onClick={() => setMobileOpen(false)}>Admin Demo</Link>

            <button
              type="button"
              className="theme-toggle"
              onClick={onToggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
              title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            >
              {isDark ? 'Light' : 'Dark'}
            </button>
            
            <Link to="/cart" className="nav-link cart-link" onClick={() => setMobileOpen(false)}>
              🛒 Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>

            {isSignedIn && (
              <div className="notifications-wrap" ref={panelRef}>
                <button
                  type="button"
                  className="nav-link notifications-button"
                  onClick={() => setShowNotifications((prev) => !prev)}
                >
                  <BellIcon />
                  Notifications
                  {unreadCount > 0 && <span className="notifications-badge">{unreadCount}</span>}
                </button>

                {showNotifications && (
                  <div className="notifications-panel">
                    <div className="notifications-panel-head">
                      <div>
                        <h4>Loyalty Inbox</h4>
                        <p>{user.loyalty_coins || 0} coins available</p>
                      </div>
                      <button type="button" className="notifications-close" onClick={() => setShowNotifications(false)}>
                        ✕
                      </button>
                    </div>

                    <div className="notifications-list">
                      {notifications.slice(0, 4).map((notification) => (
                        <div key={notification.id} className={`notification-item ${notification.is_read ? '' : 'unread'}`}>
                          <div className="notification-item-head">
                            <strong>{notification.title}</strong>
                            {notification.coin_amount !== 0 && (
                              <span className="notification-coins">+{notification.coin_amount} coins</span>
                            )}
                          </div>
                          <p>{notification.message}</p>
                        </div>
                      ))}

                      {notifications.length === 0 && (
                        <div className="notification-empty">
                          No loyalty updates yet.
                        </div>
                      )}
                    </div>

                    <Link to="/notifications" className="btn btn-primary notifications-cta" onClick={() => setShowNotifications(false)}>
                      View All
                    </Link>
                  </div>
                )}
              </div>
            )}
            
            {isSignedIn ? (
              <>
                <Link to="/profile" className="nav-link" onClick={() => setMobileOpen(false)}>Profile</Link>

                <button
                  type="button"
                  className="nav-link nav-link-button"
                  onClick={() => handleNavigate('/listings/create')}
                >
                  Create Listing
                </button>

                {(user.role === 'host' || user.role === 'both') && (
                  <Link to="/host/dashboard" className="nav-link" onClick={() => setMobileOpen(false)}>Host</Link>
                )}
                
                {(user.role === 'guest' || user.role === 'both') && (
                  <Link to="/guest/dashboard" className="nav-link" onClick={() => setMobileOpen(false)}>Bookings</Link>
                )}
                
                {(user.role === 'admin' || user.is_staff || user.is_superuser) && (
                  <>
                    <Link to="/admin/dashboard" className="nav-link admin-link" onClick={() => setMobileOpen(false)}>Admin</Link>
                    <Link to="/admin/erp" className="nav-link admin-link" onClick={() => setMobileOpen(false)}>📊 ERP</Link>
                  </>
                )}
                
                <div className="nav-user">
                  <span className="user-name">{clerkUser?.firstName || clerkUser?.username || user.username?.split('@')[0]}</span>
                  {user.gold_host_flag && <span className="badge badge-warning">⭐</span>}
                  <span className="coins-pill"><CoinIcon /> {user.loyalty_coins || 0}</span>
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
