import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingsAPI } from '../services/api';
import { toast } from 'react-toastify';
import './CreateListing.css';

const CreateListing = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    daily_price: '',
    deposit: '',
    location: '',
    address: '',
    availability_start: '',
    availability_end: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await listingsAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories');
    }
  };

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
      const response = await listingsAPI.create(formData);
      toast.success('Listing created! Awaiting admin verification.');
      navigate('/host/dashboard');
    } catch (error) {
      const errors = error.response?.data;
      if (errors) {
        Object.keys(errors).forEach(key => {
          if (Array.isArray(errors[key])) {
            toast.error(`${key}: ${errors[key][0]}`);
          }
        });
      } else {
        toast.error('Failed to create listing');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-listing-page">
      <div className="container">
        <div className="create-listing-card card">
          <h1>Create New Listing</h1>
          <p className="subtitle">List your item for rent</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g., Canon EOS 5D Mark IV Camera"
              />
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="5"
                placeholder="Describe your item, its condition, and any special features..."
              />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label>Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Mumbai, Andheri West"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Full Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="2"
                placeholder="Complete pickup address (optional)"
              />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label>Daily Price (₹) *</label>
                <input
                  type="number"
                  name="daily_price"
                  value={formData.daily_price}
                  onChange={handleChange}
                  required
                  min="1"
                  placeholder="500"
                />
              </div>

              <div className="form-group">
                <label>Security Deposit (₹) *</label>
                <input
                  type="number"
                  name="deposit"
                  value={formData.deposit}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="2000"
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label>Available From *</label>
                <input
                  type="date"
                  name="availability_start"
                  value={formData.availability_start}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>Available Until *</label>
                <input
                  type="date"
                  name="availability_end"
                  value={formData.availability_end}
                  onChange={handleChange}
                  required
                  min={formData.availability_start}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Listing'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/host/dashboard')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateListing;
