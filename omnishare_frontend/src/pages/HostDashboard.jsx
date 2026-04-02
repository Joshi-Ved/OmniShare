import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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
  const [imageModal, setImageModal] = useState({
    isOpen: false,
    src: '',
    title: '',
  });

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

  const openImageModal = (src, title) => {
    setImageModal({
      isOpen: true,
      src,
      title,
    });
  };

  const closeImageModal = () => {
    setImageModal({
      isOpen: false,
      src: '',
      title: '',
    });
  };

  useEffect(() => {
    if (!imageModal.isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeImageModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageModal.isOpen]);

  const chartData = useMemo(() => {
    const dataMap = {};
    bookings
      .filter(b => b.booking_status === 'completed')
      .forEach(b => {
        const dateString = b.created_at || b.start_date;
        const date = dateString ? new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Unknown';
        const amt = parseFloat(b.host_payout || 0);
        dataMap[date] = (dataMap[date] || 0) + amt;
      });

    return Object.keys(dataMap).map(k => ({
      date: k,
      earnings: dataMap[k]
    })).slice(-10); // Last 10 data points
  }, [bookings]);

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

        {chartData.length > 0 && (
          <div className="dashboard-chart-section card" style={{ margin: '24px 0', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Earnings Trend</h2>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line-strong)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface-strong)', borderRadius: '12px', borderColor: 'var(--glass-border)', backdropFilter: 'blur(16px)' }}
                    itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Line type="monotone" dataKey="earnings" stroke="var(--primary)" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: 'var(--surface-strong)' }} activeDot={{ r: 8, stroke: 'var(--primary-glow)', strokeWidth: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

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
                    <span className={`badge ${listing.verification_status === 'approved' ? 'badge-success' :
                        listing.verification_status === 'pending' ? 'badge-warning' :
                          'badge-danger'
                      }`}>
                      {listing.verification_status}
                    </span>
                    <span>⭐ {listing.rating} ({listing.total_reviews})</span>
                  </div>
                  <div className="listing-actions">
                    <Link to={`/listings/${listing.id}`} className="btn btn-primary">
                      View Details
                    </Link>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (listing.primary_image) {
                          openImageModal(listing.primary_image, listing.title);
                        } else {
                          toast.info('No image available for this listing');
                        }
                      }}
                    >
                      View Image
                    </button>
                  </div>
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

        {imageModal.isOpen && (
          <div className="dashboard-image-modal-backdrop" onClick={closeImageModal}>
            <div className="dashboard-image-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dashboard-image-modal-header">
                <h3>{imageModal.title}</h3>
                <button type="button" className="dashboard-image-modal-close" onClick={closeImageModal}>
                  ✕
                </button>
              </div>
              <img
                src={imageModal.src}
                alt={imageModal.title || 'Listing image'}
                className="dashboard-image-modal-img"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostDashboard;
