import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerWithEmail } from '../services/firebaseAuthService';
import { setFirestoreDocument } from '../services/firebaseFirestoreService';
import { toast } from 'react-toastify';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    phone_number: '',
    role: 'guest',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.password2) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const credential = await registerWithEmail({
        email: formData.email,
        password: formData.password,
        displayName: formData.username,
      });

      const idToken = await credential.user.getIdToken();

      const profile = {
        uid: credential.user.uid,
        username: formData.username,
        email: formData.email,
        role: formData.role,
        phone_number: formData.phone_number,
        is_staff: false,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      try {
        await setFirestoreDocument('users', credential.user.uid, profile, true);
      } catch {
      }

      localStorage.setItem('access_token', idToken);
      localStorage.removeItem('refresh_token');
      localStorage.setItem('user', JSON.stringify(profile));

      toast.success('Registration successful! Please complete your KYC.');
      navigate('/guest/dashboard');
    } catch (error) {
      toast.error(error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card card">
          <h2>Join OmniShare</h2>
          <p className="subtitle">Create your account to start renting</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Choose a username"
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="form-group">
              <label>I want to *</label>
              <select name="role" value={formData.role} onChange={handleChange} required>
                <option value="guest">Rent items (Guest)</option>
                <option value="host">List my items (Host)</option>
                <option value="both">Both rent and list</option>
              </select>
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a strong password"
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                name="password2"
                value={formData.password2}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
