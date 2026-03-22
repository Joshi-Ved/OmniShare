import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';
import './KYCSubmission.css';

const KYCSubmission = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [kycDocument, setKycDocument] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const getDashboardRoute = (profile) => {
    if (!profile) return '/';
    if (profile.role === 'admin' || profile.is_staff) return '/admin/dashboard';
    if (profile.role === 'host') return '/host/dashboard';
    return '/guest/dashboard';
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data);
      
      // Check if already verified
      if (response.data.kyc_status === 'verified') {
        toast.info('Your KYC is already verified!');
      }
    } catch (error) {
      console.error('Failed to load user profile');
      toast.error('Please login to continue');
      navigate('/login');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid document (JPG, PNG, or PDF)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setKycDocument(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!kycDocument) {
      toast.error('Please select a document to upload');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('kyc_document', kycDocument);

      const response = await authAPI.submitKYC(formData);
      toast.success(response.data.message || 'KYC submitted successfully!');
      
      // Update user data
      fetchUserProfile();
      
      // Clear form
      setKycDocument(null);
      setPreview(null);
      
      // Redirect after success
      setTimeout(() => {
        navigate(getDashboardRoute(user));
      }, 2000);
    } catch (error) {
      console.error('KYC submission error:', error);
      const statusCode = error.response?.status;
      const responseData = error.response?.data;

      if (statusCode === 401) {
        toast.error('Session expired. Please sign in again.');
      } else if (typeof responseData === 'string') {
        toast.error(responseData);
      } else if (responseData?.error) {
        toast.error(responseData.error);
      } else if (responseData?.detail) {
        toast.error(responseData.detail);
      } else if (responseData && typeof responseData === 'object') {
        const firstKey = Object.keys(responseData)[0];
        const firstValue = responseData[firstKey];
        if (Array.isArray(firstValue) && firstValue.length > 0) {
          toast.error(`${firstKey}: ${firstValue[0]}`);
        } else if (typeof firstValue === 'string') {
          toast.error(`${firstKey}: ${firstValue}`);
        } else {
          toast.error('Failed to submit KYC document');
        }
      } else {
        toast.error('Failed to submit KYC document');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="kyc-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="kyc-page">
      <div className="container">
        <div className="kyc-card card">
          <div className="kyc-header">
            <h1>KYC Verification</h1>
            <p className="subtitle">Complete your identity verification to unlock all features</p>
          </div>

          {/* KYC Status */}
          <div className={`kyc-status status-${user.kyc_status}`}>
            <div className="status-icon">
              {user.kyc_status === 'not_submitted' && '📋'}
              {user.kyc_status === 'pending' && '⏳'}
              {user.kyc_status === 'verified' && '✅'}
              {user.kyc_status === 'rejected' && '❌'}
            </div>
            <div className="status-text">
              <h3>Current Status: <span className="status-badge">{user.kyc_status.replace('_', ' ').toUpperCase()}</span></h3>
              {user.kyc_status === 'not_submitted' && (
                <p>Submit your KYC document to get verified</p>
              )}
              {user.kyc_status === 'pending' && (
                <p>Your KYC is under review. We'll notify you once it's verified.</p>
              )}
              {user.kyc_status === 'verified' && (
                <p>Your account is verified! You can now access all features.</p>
              )}
              {user.kyc_status === 'rejected' && (
                <p>Your KYC was rejected. Please resubmit with valid documents.</p>
              )}
            </div>
          </div>

          {/* Benefits */}
          <div className="kyc-benefits">
            <h3>Why verify your KYC?</h3>
            <div className="benefits-grid">
              <div className="benefit-item">
                <span className="benefit-icon">🏠</span>
                <h4>List Items</h4>
                <p>Create and manage your rental listings</p>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">🔒</span>
                <h4>Book Items</h4>
                <p>Rent items from verified hosts</p>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">💳</span>
                <h4>Secure Payments</h4>
                <p>Process payments with escrow protection</p>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">⭐</span>
                <h4>Build Trust</h4>
                <p>Increase your trust score and credibility</p>
              </div>
            </div>
          </div>

          {/* Upload Form */}
          {(user.kyc_status === 'not_submitted' || user.kyc_status === 'rejected') && (
            <form onSubmit={handleSubmit} className="kyc-form">
              <div className="form-section">
                <h3>Upload Identity Document</h3>
                <p className="help-text">
                  Accepted documents: Aadhaar Card, PAN Card, Driving License, Passport (JPG, PNG, or PDF, max 5MB)
                </p>

                <div className="file-upload-container">
                  <input
                    type="file"
                    id="kyc-document"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                  <label htmlFor="kyc-document" className="file-label">
                    <span className="upload-icon">📎</span>
                    <span className="upload-text">
                      {kycDocument ? kycDocument.name : 'Click to upload document'}
                    </span>
                  </label>
                </div>

                {/* Preview */}
                {preview && (
                  <div className="document-preview">
                    <img src={preview} alt="Document preview" />
                  </div>
                )}
                
                {kycDocument && !preview && (
                  <div className="file-info">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{kycDocument.name}</span>
                    <span className="file-size">({(kycDocument.size / 1024).toFixed(2)} KB)</span>
                  </div>
                )}
              </div>

              <div className="kyc-guidelines">
                <h4>📌 Important Guidelines:</h4>
                <ul>
                  <li>Ensure the document is clear and all details are visible</li>
                  <li>Upload a valid government-issued ID</li>
                  <li>File must be less than 5MB</li>
                  <li>Supported formats: JPG, PNG, PDF</li>
                  <li>Verification usually takes 24-48 hours</li>
                </ul>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !kycDocument}
                >
                  {loading ? 'Submitting...' : 'Submit for Verification'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Pending Message */}
          {user.kyc_status === 'pending' && (
            <div className="pending-message">
              <p>Your KYC document has been submitted and is under review.</p>
              <button className="btn btn-secondary" onClick={() => navigate(getDashboardRoute(user))}>
                Go to Dashboard
              </button>
            </div>
          )}

          {/* Verified Message */}
          {user.kyc_status === 'verified' && (
            <div className="verified-message">
              <p>🎉 Congratulations! Your account is verified.</p>
              <button className="btn btn-primary" onClick={() => navigate(getDashboardRoute(user))}>
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KYCSubmission;
