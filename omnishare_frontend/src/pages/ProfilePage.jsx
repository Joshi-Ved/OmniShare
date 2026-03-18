import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';
import './Dashboard.css';

const ProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const response = await authAPI.getProfile();
        const data = response.data;
        setProfile(data);
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
  const kycBadge =
    kyc === 'verified'
      ? 'badge badge-success'
      : kyc === 'pending'
      ? 'badge badge-warning'
      : kyc === 'rejected'
      ? 'badge badge-danger'
      : 'badge badge-info';

  return (
    <div className="dashboard-page">
      <div className="container-sm">
        <h1>My Profile</h1>

        <div className="card">
          <h2>Account Overview</h2>
          <p><strong>Username:</strong> {profile.username}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p>
            <strong>KYC Status:</strong> <span className={kycBadge}>{kyc.replace('_', ' ')}</span>
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: 12 }}>
            <Link to="/kyc/submit" className="btn btn-primary">
              {kyc === 'verified' ? 'View KYC' : 'Submit KYC'}
            </Link>
          </div>
        </div>

        <div className="card">
          <h2>Edit Profile</h2>
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
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;