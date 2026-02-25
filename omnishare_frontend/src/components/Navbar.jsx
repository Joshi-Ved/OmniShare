import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logoutFirebaseUser } from '../services/firebaseAuthService';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
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
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo">
          <h2>OmniShare</h2>
        </Link>

        <div className="nav-links">
          <Link to="/">Explore</Link>
          
          {token ? (
            <>
              {(user.role === 'host' || user.role === 'both') && (
                <Link to="/host/dashboard">Host Dashboard</Link>
              )}
              
              {(user.role === 'guest' || user.role === 'both') && (
                <Link to="/guest/dashboard">My Bookings</Link>
              )}
              
              {(user.role === 'admin' || user.is_staff) && (
                <Link to="/admin/dashboard">Admin</Link>
              )}
              
              <span className="user-info">
                {user.username}
                {user.gold_host_flag && <span className="badge badge-warning ml-2">⭐ Gold Host</span>}
              </span>
              
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
    </nav>
  );
};

export default Navbar;
