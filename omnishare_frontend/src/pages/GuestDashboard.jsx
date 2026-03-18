import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingsAPI, paymentsAPI } from '../services/api';
import { toast } from 'react-toastify';
import './Dashboard.css';

const GuestDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');

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
      const [bookingsRes, transactionsRes, invoicesRes] = await Promise.all([
        bookingsAPI.getMyBookings('guest').catch(() => ({ data: [] })),
        paymentsAPI.getTransactions().catch(() => ({ data: [] })),
        paymentsAPI.getInvoices().catch(() => ({ data: [] })),
      ]);

      setBookings(bookingsRes.data.results || bookingsRes.data || []);
      setTransactions(transactionsRes.data.results || transactionsRes.data || []);
      setInvoices(invoicesRes.data.results || invoicesRes.data || []);
    } catch (error) {
      console.error('Bookings error:', error.message);
      setBookings([]);
      setTransactions([]);
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

  const getTxnBadge = (status) => {
    const statusMap = {
      success: 'badge-success',
      pending: 'badge-warning',
      failed: 'badge-danger',
      refunded: 'badge-info',
      processing: 'badge-info',
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
          <div className="stat-card card">
            <h3>Invoices</h3>
            <p className="stat-number">{invoices.length}</p>
          </div>
        </div>

        <div className="dashboard-tabs" style={{ flexWrap: 'wrap' }}>
          <button
            className={`tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            My Bookings
          </button>
          <button
            className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Payments
          </button>
          <button
            className={`tab ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            Invoices
          </button>
        </div>

        {activeTab === 'bookings' && (
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
        )}

        {activeTab === 'transactions' && (
          <div className="bookings-list">
            {transactions.map((txn) => (
              <div key={txn.id} className="booking-card card">
                <div className="booking-header">
                  <h3>{txn.transaction_type.replace('_', ' ')}</h3>
                  <span className={getTxnBadge(txn.status)}>{txn.status}</span>
                </div>
                <p><strong>Amount:</strong> ₹{txn.amount}</p>
                <p><strong>Booking:</strong> #{txn.booking}</p>
                <p><strong>Date:</strong> {new Date(txn.created_at).toLocaleString()}</p>
              </div>
            ))}
            {transactions.length === 0 && <div className="no-results"><p>No transactions found.</p></div>}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="bookings-list">
            {invoices.map((inv) => (
              <div key={inv.id} className="booking-card card">
                <div className="booking-header">
                  <h3>{inv.invoice_number}</h3>
                  <span className={getTxnBadge(inv.pdf_generated ? 'success' : 'pending')}>
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
            {invoices.length === 0 && <div className="no-results"><p>No invoices found yet.</p></div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestDashboard;
