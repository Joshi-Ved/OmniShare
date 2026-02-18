import React, { useState, useEffect } from 'react';
import { adminAPI, listingsAPI, authAPI } from '../services/api';
import { toast } from 'react-toastify';
import './Dashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pendingListings, setPendingListings] = useState([]);
  const [pendingKYC, setPendingKYC] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, listingsRes, kycRes, disputesRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getPendingListings(),
        adminAPI.getPendingKYC(),
        adminAPI.getDisputedBookings(),
      ]);
      
      setStats(statsRes.data);
      setPendingListings(listingsRes.data.results || listingsRes.data);
      setPendingKYC(kycRes.data.results || kycRes.data);
      setDisputes(disputesRes.data.results || disputesRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyListing = async (listingId, status) => {
    try {
      await adminAPI.verifyListing({
        listing_id: listingId,
        status,
        remarks: status === 'approved' ? 'Verified' : 'Does not meet requirements',
      });
      toast.success(`Listing ${status}`);
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to verify listing');
    }
  };

  const handleVerifyKYC = async (userId, status) => {
    try {
      await adminAPI.verifyKYC({
        user_id: userId,
        status,
        remarks: '',
      });
      toast.success(`KYC ${status}`);
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to verify KYC');
    }
  };

  const handleResolveDispute = async (bookingId, refundToGuest) => {
    const resolution = prompt('Enter resolution details:');
    if (!resolution) return;

    try {
      await adminAPI.resolveDispute({
        booking_id: bookingId,
        resolution,
        refund_to_guest: refundToGuest,
      });
      toast.success('Dispute resolved');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to resolve dispute');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard-page">
      <div className="container">
        <h1>Admin Dashboard</h1>

        <div className="dashboard-tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab ${activeTab === 'listings' ? 'active' : ''}`}
            onClick={() => setActiveTab('listings')}
          >
            Pending Listings ({pendingListings.length})
          </button>
          <button
            className={`tab ${activeTab === 'kyc' ? 'active' : ''}`}
            onClick={() => setActiveTab('kyc')}
          >
            Pending KYC ({pendingKYC.length})
          </button>
          <button
            className={`tab ${activeTab === 'disputes' ? 'active' : ''}`}
            onClick={() => setActiveTab('disputes')}
          >
            Disputes ({disputes.length})
          </button>
        </div>

        {activeTab === 'overview' && stats && (
          <div>
            <div className="dashboard-stats grid grid-4">
              <div className="stat-card card">
                <h3>Total Users</h3>
                <p className="stat-number">{stats.users.total}</p>
              </div>
              <div className="stat-card card">
                <h3>Total Listings</h3>
                <p className="stat-number">{stats.listings.total}</p>
              </div>
              <div className="stat-card card">
                <h3>Total Bookings</h3>
                <p className="stat-number">{stats.bookings.total}</p>
              </div>
              <div className="stat-card card">
                <h3>Platform Revenue</h3>
                <p className="stat-number">₹{stats.revenue.total_platform_revenue.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="card">
                <h3>Users</h3>
                <p>Verified: {stats.users.verified}</p>
                <p>Gold Hosts: {stats.users.gold_hosts}</p>
              </div>
              <div className="card">
                <h3>Bookings</h3>
                <p>Completed: {stats.bookings.completed}</p>
                <p>Active: {stats.bookings.active}</p>
                <p>Disputed: {stats.bookings.disputed}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'listings' && (
          <div className="listings-section">
            <h2>Pending Listings</h2>
            <div className="grid grid-2">
              {pendingListings.map((listing) => (
                <div key={listing.id} className="listing-card card">
                  <h3>{listing.title}</h3>
                  <p>{listing.description.substring(0, 100)}...</p>
                  <p><strong>Host:</strong> {listing.host.username}</p>
                  <p><strong>Price:</strong> ₹{listing.daily_price}/day</p>
                  <p><strong>Location:</strong> {listing.location}</p>
                  <div className="listing-actions">
                    <button
                      onClick={() => handleVerifyListing(listing.id, 'approved')}
                      className="btn btn-secondary"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleVerifyListing(listing.id, 'rejected')}
                      className="btn btn-danger"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'kyc' && (
          <div className="kyc-section">
            <h2>Pending KYC Verifications</h2>
            <div className="bookings-list">
              {pendingKYC.map((user) => (
                <div key={user.id} className="booking-card card">
                  <h3>{user.username}</h3>
                  <p>Email: {user.email}</p>
                  <p>Role: {user.role}</p>
                  <p>Submitted: {new Date(user.created_at).toLocaleDateString()}</p>
                  <div className="listing-actions">
                    <button
                      onClick={() => handleVerifyKYC(user.id, 'verified')}
                      className="btn btn-secondary"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => handleVerifyKYC(user.id, 'rejected')}
                      className="btn btn-danger"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'disputes' && (
          <div className="disputes-section">
            <h2>Active Disputes</h2>
            <div className="bookings-list">
              {disputes.map((booking) => (
                <div key={booking.id} className="booking-card card">
                  <h3>Booking #{booking.id} - {booking.listing_title}</h3>
                  <p><strong>Guest:</strong> {booking.guest_name}</p>
                  <p><strong>Host:</strong> {booking.host_name}</p>
                  <p><strong>Amount:</strong> ₹{booking.guest_total}</p>
                  <p><strong>Reason:</strong> {booking.dispute_reason}</p>
                  <div className="listing-actions">
                    <button
                      onClick={() => handleResolveDispute(booking.id, false)}
                      className="btn btn-secondary"
                    >
                      Resolve (Favor Host)
                    </button>
                    <button
                      onClick={() => handleResolveDispute(booking.id, true)}
                      className="btn btn-warning"
                    >
                      Resolve (Refund Guest)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
