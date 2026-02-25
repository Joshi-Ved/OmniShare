import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listingsAPI } from '../services/api';
import { toast } from 'react-toastify';
import './Home.css';

const Home = () => {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    min_price: '',
    max_price: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchListings();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await listingsAPI.getCategories();
      setCategories(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const response = await listingsAPI.getAll(filters);
      setListings(response.data.results || response.data || []);
    } catch (error) {
      console.error('Listings error:', error.message);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleSearch = () => {
    fetchListings();
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="hero">
        <div className="container">
          <h1>Rent Anything, From Anyone, Anywhere</h1>
          <p>Join India's fastest growing P2P rental marketplace</p>
          <div className="hero-search">
            <input
              type="text"
              name="location"
              placeholder="Search by location..."
              value={filters.location}
              onChange={handleFilterChange}
            />
            <button onClick={handleSearch} className="btn btn-primary">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container">
        <div className="filters">
          <div className="filters-grid">
            <div className="form-group">
              <label>Category</label>
              <select name="category" value={filters.category} onChange={handleFilterChange}>
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                placeholder="Search location..."
              />
            </div>

            <div className="form-group">
              <label>Min Price (₹/day)</label>
              <input
                type="number"
                name="min_price"
                value={filters.min_price}
                onChange={handleFilterChange}
                placeholder="Min"
              />
            </div>

            <div className="form-group">
              <label>Max Price (₹/day)</label>
              <input
                type="number"
                name="max_price"
                value={filters.max_price}
                onChange={handleFilterChange}
                placeholder="Max"
              />
            </div>

            <button onClick={handleSearch} className="btn btn-primary">
              Search
            </button>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="loading">Loading listings...</div>
        ) : listings.length > 0 ? (
          <div className="listings-grid grid grid-3">
            {listings.map((listing) => (
              <Link to={`/listings/${listing.id}`} key={listing.id} className="listing-card">
                <div className="listing-image-wrapper">
                  {listing.primary_image ? (
                    <img src={listing.primary_image} alt={listing.title} className="listing-image" />
                  ) : (
                    <div className="no-image">📦</div>
                  )}
                  {listing.promoted_flag && (
                    <span className="promoted-badge">⭐ Promoted</span>
                  )}
                  {listing.rating > 0 && (
                    <div className="rating-badge">⭐ {listing.rating.toFixed(1)}</div>
                  )}
                </div>
                
                <div className="listing-content">
                  <h3>{listing.title}</h3>
                  <div className="listing-meta">
                    <span className="location">📍 {listing.location}</span>
                    <span className="category">{listing.category}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--neutral-600)', margin: '0' }}>
                    {listing.description?.substring(0, 60)}...
                  </p>
                  
                  <div className="listing-price">
                    <div className="price">
                      ₹{listing.daily_price}
                      <span className="price-unit">/day</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="no-listings">
            <div className="no-listings-icon">📦</div>
            <p>No listings found. Try adjusting your filters.</p>
            <button onClick={() => setFilters({ category: '', location: '', min_price: '', max_price: '' })} 
                    className="btn btn-primary">
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
