import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles && rejectedFiles.length > 0) {
      toast.error('Invalid file type or size. Please provide a JPG, PNG, or PDF under 5MB.');
      return;
    }
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setKycDocument(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

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

                <div
                  {...getRootProps()}
                  className={`file-upload-container ${isDragActive ? 'drag-active' : ''}`}
                  style={{
                    border: isDragActive ? '2px dashed var(--primary)' : '2px dashed var(--line-strong)',
                    background: isDragActive ? 'var(--primary-glow)' : 'var(--surface-strong)',
                    padding: '40px 20px',
                    textAlign: 'center',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)',
                    marginBottom: '16px'
                  }}
                >
                  <input {...getInputProps()} id="kyc-document" />
                  <div className="upload-label-content">
                    <span className="upload-icon" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>
                      {isDragActive ? '🚀' : '📥'}
                    </span>
                    <span className="upload-text" style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1.1rem' }}>
                      {isDragActive
                        ? 'Drop your document here...'
                        : (kycDocument ? kycDocument.name : 'Drag & drop a file here, or click to browse')}
                    </span>
                  </div>
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
