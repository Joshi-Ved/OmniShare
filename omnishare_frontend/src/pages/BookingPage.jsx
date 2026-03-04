import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import { toast } from 'react-toastify';
import './BookingPage.css';

const BookingPage = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [qrToken, setQrToken] = useState('');

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

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

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
      </div>
    </div>
  );
};

export default BookingPage;
