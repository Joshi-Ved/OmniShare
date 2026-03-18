import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { bookingsAPI, paymentsAPI } from '../services/api';
import { toast } from 'react-toastify';
import './BookingPage.css';

const BookingPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isHost = booking && String(booking.host) === String(currentUser.id);
  const isGuest = booking && String(booking.guest) === String(currentUser.id);

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    try {
      const response = await bookingsAPI.getById(id);
      setBooking(response.data);
    } catch (error) {
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchBillingData = useCallback(async (bookingId) => {
    setBillingLoading(true);
    try {
      const [txRes, invRes] = await Promise.all([
        paymentsAPI.getTransactions().catch(() => ({ data: [] })),
        paymentsAPI.getInvoices().catch(() => ({ data: [] })),
      ]);

      const txData = txRes.data?.results || txRes.data || [];
      const invData = invRes.data?.results || invRes.data || [];

      const bookingTransactions = txData.filter((tx) => String(tx.booking) === String(bookingId));
      const bookingInvoice = invData.find((item) => String(item.booking) === String(bookingId)) || null;

      setTransactions(bookingTransactions);
      setInvoice(bookingInvoice);
    } catch (_error) {
      setTransactions([]);
      setInvoice(null);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      await fetchBooking();
    };
    loadAll();
  }, [fetchBooking]);

  useEffect(() => {
    if (booking?.id) {
      fetchBillingData(booking.id);
    }
  }, [booking?.id, fetchBillingData]);

  const runAction = async (callback, successMessage) => {
    setActionLoading(true);
    try {
      await callback();
      toast.success(successMessage);
      await fetchBooking();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Enter cancellation reason');
    if (!reason) return;
    runAction(() => bookingsAPI.cancel({ booking_id: booking.id, reason }), 'Booking cancelled');
  };

  const handleDispute = async () => {
    const reason = window.prompt('Enter dispute reason');
    if (!reason) return;
    runAction(() => bookingsAPI.raiseDispute({ booking_id: booking.id, reason }), 'Dispute raised');
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
      toast.success('Invoice downloaded');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to download invoice');
    }
  };

  const handleInvoiceResend = async (invoiceId) => {
    try {
      await paymentsAPI.resendInvoice(invoiceId);
      toast.success('Invoice email resent successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to resend invoice');
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

  if (loading) {
    return (
      <div className="booking-page">
        <div className="container">
          <div className="card">Loading booking details...</div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="booking-page">
        <div className="container">
          <div className="card">Booking not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="container">
        <h1>Booking #{booking.id}</h1>

        {location.state?.paymentSuccess && (
          <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #10b981' }}>
            <h3>Payment Confirmed</h3>
            <p>Your payment was verified successfully.</p>
            {location.state?.invoiceNumber && <p><strong>Invoice:</strong> {location.state.invoiceNumber}</p>}
          </div>
        )}

        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>{booking.listing_title}</h3>
          <p><strong>Status:</strong> {booking.booking_status}</p>
          <p><strong>Guest:</strong> {booking.guest_name}</p>
          <p><strong>Host:</strong> {booking.host_name}</p>
          <p><strong>Dates:</strong> {booking.start_date} to {booking.end_date}</p>
          <p><strong>Guest Total:</strong> ₹{booking.guest_total}</p>
          <p><strong>Host Payout:</strong> ₹{booking.host_payout}</p>
          <p><strong>Platform Commission:</strong> ₹{booking.platform_commission}</p>
        </div>

        {booking.qr_code && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3>Booking QR</h3>
            <img src={booking.qr_code} alt="Booking QR" style={{ maxWidth: '220px' }} />
            <p style={{ marginTop: '10px' }}>Use this QR for handover and return verification.</p>
          </div>
        )}

        <div className="card">
          <h3>Actions</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isGuest && booking.booking_status === 'pending' && (
              <Link className="btn btn-primary" to={`/payments/${booking.id}`}>
                Pay Now
              </Link>
            )}

            {isHost && booking.can_confirm && (
              <button
                className="btn btn-secondary"
                disabled={actionLoading}
                onClick={() => runAction(() => bookingsAPI.confirm(booking.id), 'Booking confirmed')}
              >
                Confirm Booking
              </button>
            )}

            {(isHost || isGuest) && (booking.can_handover || booking.can_return) && (
              <>
                <input
                  type="text"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  placeholder="Enter QR token"
                  style={{ minWidth: '220px', padding: '10px' }}
                />
                {isHost && booking.can_handover && (
                  <button
                    className="btn btn-primary"
                    disabled={actionLoading || !qrToken}
                    onClick={() => runAction(() => bookingsAPI.handover({ booking_id: booking.id, qr_token: qrToken }), 'Handover marked')}
                  >
                    Mark Handover
                  </button>
                )}
                {isHost && booking.can_return && (
                  <button
                    className="btn btn-primary"
                    disabled={actionLoading || !qrToken}
                    onClick={() => runAction(() => bookingsAPI.return({ booking_id: booking.id, qr_token: qrToken }), 'Return marked')}
                  >
                    Mark Return
                  </button>
                )}
              </>
            )}

            {isHost && booking.can_complete && (
              <button
                className="btn btn-secondary"
                disabled={actionLoading}
                onClick={() => runAction(() => bookingsAPI.complete(booking.id), 'Booking completed')}
              >
                Complete Booking
              </button>
            )}

            {(isGuest || isHost) && booking.can_cancel && (
              <button className="btn btn-warning" disabled={actionLoading} onClick={handleCancel}>
                Cancel Booking
              </button>
            )}

            {(isGuest || isHost) && booking.can_dispute && (
              <button className="btn btn-danger" disabled={actionLoading} onClick={handleDispute}>
                Raise Dispute
              </button>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Invoice</h3>
          {billingLoading && <p>Loading billing data...</p>}

          {!billingLoading && !invoice && (
            <p>Invoice will be generated after successful payment verification.</p>
          )}

          {!billingLoading && invoice && (
            <>
              <p><strong>Invoice Number:</strong> {invoice.invoice_number}</p>
              <p><strong>Invoice Date:</strong> {invoice.invoice_date}</p>
              <p><strong>Total:</strong> ₹{invoice.total_amount}</p>
              <p><strong>PDF Generated:</strong> {invoice.pdf_generated ? 'Yes' : 'No'}</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleInvoiceDownload(invoice.id, invoice.invoice_number)}
                  disabled={!invoice.pdf_generated}
                >
                  Download Invoice
                </button>
                <button className="btn btn-secondary" onClick={() => handleInvoiceResend(invoice.id)}>
                  Resend Invoice Email
                </button>
              </div>
            </>
          )}
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Payment Transactions</h3>
          {billingLoading && <p>Loading transaction history...</p>}

          {!billingLoading && transactions.length === 0 && (
            <p>No payment transactions recorded for this booking yet.</p>
          )}

          {!billingLoading && transactions.length > 0 && (
            <div className="bookings-list">
              {transactions.map((txn) => (
                <div key={txn.id} className="booking-card card" style={{ marginBottom: '10px' }}>
                  <div className="booking-header">
                    <h3>{txn.transaction_type.replace('_', ' ')}</h3>
                    <span className={getTxnBadge(txn.status)}>{txn.status}</span>
                  </div>
                  <p><strong>Amount:</strong> ₹{txn.amount}</p>
                  <p><strong>Created:</strong> {new Date(txn.created_at).toLocaleString()}</p>
                  {txn.razorpay_payment_id && <p><strong>Payment ID:</strong> {txn.razorpay_payment_id}</p>}
                  {txn.description && <p><strong>Note:</strong> {txn.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
