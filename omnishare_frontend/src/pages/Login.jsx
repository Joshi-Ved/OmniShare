import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginWithEmail } from '../services/firebaseAuthService';
import { getFirestoreDocument, setFirestoreDocument } from '../services/firebaseFirestoreService';
import { toast } from 'react-toastify';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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
    setLoading(true);

    try {
      const credential = await loginWithEmail({
        email: formData.email,
        password: formData.password,
      });

      const idToken = await credential.user.getIdToken();
      const existingUser = JSON.parse(localStorage.getItem('user') || '{}');

      let profile = null;
      try {
        profile = await getFirestoreDocument('users', credential.user.uid);
      } catch {
      }

      if (!profile) {
        profile = {
          uid: credential.user.uid,
          username: credential.user.displayName || credential.user.email || 'User',
          email: credential.user.email,
          role: existingUser.role || 'guest',
          is_staff: Boolean(existingUser.is_staff),
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };

        try {
          await setFirestoreDocument('users', credential.user.uid, profile, true);
        } catch {
        }
      }

      localStorage.setItem('access_token', idToken);
      localStorage.removeItem('refresh_token');
      localStorage.setItem('user', JSON.stringify(profile));

      toast.success('Login successful!');

      if (profile.role === 'admin' || profile.is_staff) {
        navigate('/admin/dashboard');
      } else if (profile.role === 'host') {
        navigate('/host/dashboard');
      } else {
        navigate('/guest/dashboard');
      }
    } catch (error) {
      toast.error(error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card card">
          <h2>Welcome Back</h2>
          <p className="subtitle">Login to your OmniShare account</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
