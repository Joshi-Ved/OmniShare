import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
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
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.password2) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authAPI.register(formData);

      const loginResponse = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });

      localStorage.setItem('access_token', loginResponse.data.access_token);
      localStorage.setItem('user', JSON.stringify(loginResponse.data.user));

      toast.success('Registration successful');
      navigate('/guest/dashboard');
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Registration failed';
      toast.error(message);
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
              <input type="text" name="username" value={formData.username} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} />
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
              <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={8} />
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <input type="password" name="password2" value={formData.password2} onChange={handleChange} required />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>

            <Link to="/clerk/sign-up" className="btn btn-secondary" style={{ width: '100%' }}>
              Sign up with Clerk
            </Link>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
