import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listingsAPI, bookingsAPI, paymentsAPI } from '../services/api';
import { toast } from 'react-toastify';
import './Dashboard.css';

const HostDashboard = () => {
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('listings');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('Please login to continue');
        setLoading(false);
        return;
      }
      const [listingsRes, bookingsRes, settlementsRes, invoicesRes] = await Promise.all([
        listingsAPI.getMyListings().catch(() => ({ data: { results: [] } })),
        bookingsAPI.getMyBookings('host').catch(() => ({ data: { results: [] } })),
        paymentsAPI.getSettlements().catch(() => ({ data: [] })),
        paymentsAPI.getInvoices().catch(() => ({ data: [] })),
      ]);
      setListings(listingsRes.data.results || listingsRes.data || []);
      setBookings(bookingsRes.data.results || bookingsRes.data || []);
      setSettlements(settlementsRes.data.results || settlementsRes.data || []);
      setInvoices(invoicesRes.data.results || invoicesRes.data || []);
    } catch (error) {
      console.error('Dashboard error:', error.message);
      setListings([]);
      setBookings([]);
      setSettlements([]);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceDownload = async (invoiceId, invoiceNumber) => {
    try {
      const response = await paymentsAPI.downloadInvoice(invoiceId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber || `invoice-${invoiceId}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download invoice');
    }
  };

  const getSettlementBadge = (status) => {
    const statusMap = {
      completed: 'badge-success',
      pending: 'badge-warning',
      processing: 'badge-info',
      failed: 'badge-danger',
    };
    return `badge ${statusMap[status] || 'badge-info'}`;
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
        <h1>Host Dashboard</h1>

        <div className="dashboard-stats grid grid-4">
          <div className="stat-card card">
            <h3>Total Listings</h3>
            <p className="stat-number">{listings.length}</p>
          </div>
          <div className="stat-card card">
            <h3>Active Bookings</h3>
            <p className="stat-number">
              {bookings.filter(b => ['confirmed', 'in_use'].includes(b.booking_status)).length}
            </p>
          </div>
          <div className="stat-card card">
            <h3>Completed</h3>
            <p className="stat-number">
              {bookings.filter(b => b.booking_status === 'completed').length}
            </p>
          </div>
          <div className="stat-card card">
            <h3>Total Earnings</h3>
            <p className="stat-number">
              ₹{bookings.filter(b => b.booking_status === 'completed')
                .reduce((sum, b) => sum + parseFloat(b.host_payout || 0), 0).toFixed(2)}
            </p>
          </div>
          <div className="stat-card card">
            <h3>Settlements</h3>
            <p className="stat-number">{settlements.length}</p>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button
            className={`tab ${activeTab === 'listings' ? 'active' : ''}`}
            onClick={() => setActiveTab('listings')}
          >
            My Listings
          </button>
          <button
            className={`tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            Bookings
          </button>
          <button
            className={`tab ${activeTab === 'settlements' ? 'active' : ''}`}
            onClick={() => setActiveTab('settlements')}
          >
            Settlements
          </button>
          <button
            className={`tab ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            Invoices
          </button>
        </div>

        {activeTab === 'listings' && (
          <div className="listings-section">
            <div className="section-header">
              <h2>My Listings</h2>
              <Link to="/listings/create" className="btn btn-primary">
                + Create Listing
              </Link>
            </div>

            <div className="grid grid-3">
              {listings.map((listing) => (
                <div key={listing.id} className="listing-card card">
                  <h3>{listing.title}</h3>
                  <p>₹{listing.daily_price}/day</p>
                  <p className="location">📍 {listing.location}</p>
                  <div className="listing-stats">
                    <span className={`badge ${
                      listing.verification_status === 'approved' ? 'badge-success' :
                      listing.verification_status === 'pending' ? 'badge-warning' :
                      'badge-danger'
                    }`}>
                      {listing.verification_status}
                    </span>
                    <span>⭐ {listing.rating} ({listing.total_reviews})</span>
                  </div>
                  <Link to={`/listings/${listing.id}`} className="btn btn-primary">
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bookings-section">
            <h2>Bookings</h2>
            <div className="bookings-list">
              {bookings.map((booking) => (
                <div key={booking.id} className="booking-card card">
                  <div className="booking-header">
                    <h3>{booking.listing_title}</h3>
                    <span className={getStatusBadge(booking.booking_status)}>
                      {booking.booking_status.replace('_', ' ')}
                    </span>
                  </div>
                  <p>Guest: {booking.guest_name}</p>
                  <p>Dates: {booking.start_date} to {booking.end_date}</p>
                  <p>Amount: ₹{booking.guest_total}</p>
                  <p>Your Earning: ₹{booking.host_payout}</p>
                  <Link to={`/bookings/${booking.id}`} className="btn btn-primary">
                    Manage
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settlements' && (
          <div className="bookings-section">
            <h2>Settlement Timeline</h2>
            <div className="bookings-list">
              {settlements.map((settlement) => (
                <div key={settlement.id} className="booking-card card">
                  <div className="booking-header">
                    <h3>{settlement.settlement_type.replace('_', ' ')}</h3>
                    <span className={getSettlementBadge(settlement.status)}>{settlement.status}</span>
                  </div>
                  <p><strong>Amount:</strong> ₹{settlement.amount}</p>
                  <p><strong>Created:</strong> {new Date(settlement.created_at).toLocaleString()}</p>
                  {settlement.processed_at && <p><strong>Processed:</strong> {new Date(settlement.processed_at).toLocaleString()}</p>}
                </div>
              ))}
              {settlements.length === 0 && <div className="no-results"><p>No settlements found.</p></div>}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="bookings-section">
            <h2>Invoices</h2>
            <div className="bookings-list">
              {invoices.map((inv) => (
                <div key={inv.id} className="booking-card card">
                  <div className="booking-header">
                    <h3>{inv.invoice_number}</h3>
                    <span className={getSettlementBadge(inv.pdf_generated ? 'completed' : 'pending')}>
                      {inv.pdf_generated ? 'ready' : 'processing'}
                    </span>
                  </div>
                  <p><strong>Booking:</strong> #{inv.booking}</p>
                  <p><strong>Total:</strong> ₹{inv.total_amount}</p>
                  <p><strong>Date:</strong> {inv.invoice_date}</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleInvoiceDownload(inv.id, inv.invoice_number)}
                    disabled={!inv.pdf_generated}
                  >
                    Download PDF
                  </button>
                </div>
              ))}
              {invoices.length === 0 && <div className="no-results"><p>No invoices found.</p></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostDashboard;
