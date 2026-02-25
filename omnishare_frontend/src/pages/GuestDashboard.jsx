import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import { toast } from 'react-toastify';
import './Dashboard.css';

const GuestDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('Please login to view your bookings');
        setLoading(false);
        return;
      }
      const response = await bookingsAPI.getMyBookings('guest');
      setBookings(response.data.results || response.data || []);
    } catch (error) {
      console.error('Bookings error:', error.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: 'badge-warning',
      confirmed: 'badge-info',
      in_use: 'badge-info',
      completed: 'badge-success',
      cancelled: 'badge-danger',
      disputed: 'badge-danger',
    };
    return `badge ${statusMap[status] || 'badge-info'}`;
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard-page">
      <div className="container">
        <h1>My Bookings</h1>

        <div className="dashboard-stats grid grid-4">
          <div className="stat-card card">
            <h3>Total Bookings</h3>
            <p className="stat-number">{bookings.length}</p>
          </div>
          <div className="stat-card card">
            <h3>Upcoming</h3>
            <p className="stat-number">
              {bookings.filter(b => b.booking_status === 'confirmed').length}
            </p>
          </div>
          <div className="stat-card card">
            <h3>Active</h3>
            <p className="stat-number">
              {bookings.filter(b => b.booking_status === 'in_use').length}
            </p>
          </div>
          <div className="stat-card card">
            <h3>Completed</h3>
            <p className="stat-number">
              {bookings.filter(b => b.booking_status === 'completed').length}
            </p>
          </div>
        </div>

        <div className="bookings-list">
          {bookings.map((booking) => (
            <div key={booking.id} className="booking-card card">
              <div className="booking-header">
                <h3>{booking.listing_title}</h3>
                <span className={getStatusBadge(booking.booking_status)}>
                  {booking.booking_status.replace('_', ' ')}
                </span>
              </div>
              <div className="booking-details">
                <p><strong>Host:</strong> {booking.host_name}</p>
                <p><strong>Dates:</strong> {booking.start_date} to {booking.end_date}</p>
                <p><strong>Duration:</strong> {booking.rental_days} days</p>
                <p><strong>Total Paid:</strong> ₹{booking.guest_total}</p>
                <p><strong>Deposit:</strong> ₹{booking.deposit}</p>
              </div>
              <Link to={`/bookings/${booking.id}`} className="btn btn-primary">
                View Details
              </Link>
            </div>
          ))}

          {bookings.length === 0 && (
            <div className="no-results">
              <p>No bookings yet. <Link to="/">Browse listings</Link> to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestDashboard;
