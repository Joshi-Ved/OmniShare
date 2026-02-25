import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logoutFirebaseUser } from '../services/firebaseAuthService';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const token = localStorage.getItem('access_token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = async () => {
    try {
      await logoutFirebaseUser();
    } catch {
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setMobileOpen(false);
    navigate('/login');
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
            
            {token ? (
              <>
                {(user.role === 'host' || user.role === 'both') && (
                  <Link to="/host/dashboard" className="nav-link">Host</Link>
                )}
                
                {(user.role === 'guest' || user.role === 'both') && (
                  <Link to="/guest/dashboard" className="nav-link">Bookings</Link>
                )}
                
                {(user.role === 'admin' || user.is_staff) && (
                  <Link to="/admin/dashboard" className="nav-link" style={{color: 'var(--danger)'}}>Admin</Link>
                )}
                
                <div className="nav-user">
                  <span className="user-name">{user.username?.split('@')[0]}</span>
                  {user.gold_host_flag && <span className="badge badge-warning">⭐</span>}
                </div>
                
                <button onClick={handleLogout} className="btn btn-primary">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary">
                  Login
                </Link>
                <Link to="/register" className="btn btn-secondary">
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
