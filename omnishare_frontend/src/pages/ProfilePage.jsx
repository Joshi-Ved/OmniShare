import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI, bookingsAPI, listingsAPI } from '../services/api';
import { toast } from 'react-toastify';
import './ProfilePage.css';

const ProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('rentals');
  const [rentals, setRentals] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const [profileResponse, rentalsResponse, listingsResponse] = await Promise.all([
          authAPI.getProfile(),
          bookingsAPI.getMyBookings('guest').catch(() => ({ data: [] })),
          listingsAPI.getMyListings().catch(() => ({ data: [] })),
        ]);

        const data = profileResponse.data;
        const rentalsData = Array.isArray(rentalsResponse.data)
          ? rentalsResponse.data
          : rentalsResponse.data?.results || [];
        const listingsData = Array.isArray(listingsResponse.data)
          ? listingsResponse.data
          : listingsResponse.data?.results || [];

        setProfile(data);
        setRentals(rentalsData);
        setMyListings(listingsData);
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone_number: data.phone_number || '',
        });
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile(form);
      toast.success('Profile updated');
      const refreshed = await authAPI.getProfile();
      setProfile(refreshed.data);
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...localUser, ...refreshed.data }));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading profile...</div>;
  if (!profile) return <div className="loading">Unable to load profile</div>;

  const kyc = profile.kyc_status || 'not_submitted';
  const fullName = `${form.first_name} ${form.last_name}`.trim() || profile.username || 'OmniShare User';
  const completedRentals = rentals.filter((booking) => booking.booking_status === 'completed').length;
  const activeRentals = rentals.filter((booking) => ['confirmed', 'in_use'].includes(booking.booking_status)).length;
  const verifiedListings = myListings.filter((listing) => listing.verification_status === 'approved').length;
  const avgRating = myListings.length
    ? (
        myListings.reduce((sum, listing) => sum + Number(listing.rating || 0), 0) /
        myListings.length
      ).toFixed(1)
    : '0.0';

  const kycBadge =
    kyc === 'verified'
      ? 'badge badge-success'
      : kyc === 'pending'
      ? 'badge badge-warning'
      : kyc === 'rejected'
      ? 'badge badge-danger'
      : 'badge badge-info';

  return (
    <div className="profile-page">
      <div className="container-lg">
        <section className="profile-hero card">
          <div className="profile-main">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">{fullName.charAt(0).toUpperCase()}</div>
              <button type="button" className="avatar-edit-btn" aria-label="Edit profile photo">✎</button>
            </div>

            <div className="profile-copy">
              <h1>{fullName}</h1>
              <p>{profile.email}</p>
              <p className="profile-meta">Role: {profile.role} · KYC: <span className={kycBadge}>{kyc.replace('_', ' ')}</span></p>
            </div>

            <div className="profile-actions">
              <button type="button" className="btn btn-primary" onClick={() => setActiveTab('settings')}>
                Edit Profile
              </button>
              <Link to="/kyc/submit" className="btn btn-secondary">
                {kyc === 'verified' ? 'View KYC' : 'Submit KYC'}
              </Link>
            </div>
          </div>

          <div className="profile-stats-grid">
            <div className="profile-stat-card">
              <span>{rentals.length}</span>
              <p>Items Rented</p>
            </div>
            <div className="profile-stat-card">
              <span>{verifiedListings}</span>
              <p>Items Listed</p>
            </div>
            <div className="profile-stat-card">
              <span>{avgRating} ★</span>
              <p>Avg Rating</p>
            </div>
          </div>
        </section>

        <div className="profile-tabs">
          <button className={`tab ${activeTab === 'rentals' ? 'active' : ''}`} onClick={() => setActiveTab('rentals')}>My Rentals</button>
          <button className={`tab ${activeTab === 'listings' ? 'active' : ''}`} onClick={() => setActiveTab('listings')}>My Listings</button>
          <button className={`tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>Order History</button>
          <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Account Services</button>
        </div>

        {activeTab === 'rentals' && (
          <section className="profile-content-grid">
            <div className="card">
              <div className="profile-section-head">
                <h2>Active Rentals</h2>
                <span>{activeRentals} active</span>
              </div>

              <div className="profile-list">
                {rentals.slice(0, 6).map((booking) => (
                  <article key={booking.id} className="profile-list-item">
                    <div>
                      <h3>{booking.listing_title}</h3>
                      <p>Order #{booking.id} · {booking.booking_status}</p>
                    </div>
                    <div className="profile-list-amount">₹{Number(booking.guest_total || 0).toFixed(2)}</div>
                  </article>
                ))}

                {rentals.length === 0 && <p className="no-results">No rentals yet</p>}
              </div>
            </div>

            <aside className="card">
              <h3>Rental Snapshot</h3>
              <p>Completed rentals: <strong>{completedRentals}</strong></p>
              <p>Total rentals: <strong>{rentals.length}</strong></p>
              <p>Verified listings: <strong>{verifiedListings}</strong></p>
            </aside>
          </section>
        )}

        {activeTab === 'listings' && (
          <section className="card">
            <div className="profile-section-head">
              <h2>My Listings</h2>
              <Link to="/listings/create" className="btn btn-primary">Add Listing</Link>
            </div>

            <div className="profile-list">
              {myListings.map((listing) => (
                <article key={listing.id} className="profile-list-item">
                  <div>
                    <h3>{listing.title}</h3>
                    <p>{listing.verification_status} · ₹{listing.daily_price}/day</p>
                  </div>
                  <Link to={`/listings/${listing.id}`} className="btn btn-secondary">View</Link>
                </article>
              ))}

              {myListings.length === 0 && <p className="no-results">No listings created yet</p>}
            </div>
          </section>
        )}

        {activeTab === 'orders' && (
          <section className="card">
            <h2>Order History</h2>
            <div className="profile-list">
              {rentals.map((booking) => (
                <article key={`history-${booking.id}`} className="profile-list-item">
                  <div>
                    <h3>{booking.listing_title}</h3>
                    <p>Status: {booking.booking_status} · {booking.start_date} to {booking.end_date}</p>
                  </div>
                  <div className="profile-list-amount">₹{Number(booking.guest_total || 0).toFixed(2)}</div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="card profile-settings-card">
            <h2>Account Services</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>First Name</label>
                <input name="first_name" value={form.first_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input name="last_name" value={form.last_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input name="phone_number" value={form.phone_number} onChange={handleChange} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;