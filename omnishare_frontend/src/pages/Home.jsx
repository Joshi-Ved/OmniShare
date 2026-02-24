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
      setListings(response.data.results || response.data);
    } catch (error) {
      toast.error('Failed to load listings');
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
        <div className="filters card">
          <div className="grid grid-4">
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

            <div className="form-group">
              <label>&nbsp;</label>
              <button onClick={handleSearch} className="btn btn-primary">
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="loading">Loading listings...</div>
        ) : (
          <div className="listings-grid grid grid-3">
            {listings.map((listing) => (
              <Link to={`/listings/${listing.id}`} key={listing.id} className="listing-card card">
                <div className="listing-image">
                  {listing.primary_image ? (
                    <img src={listing.primary_image} alt={listing.title} />
                  ) : (
                    <div className="no-image">No Image</div>
                  )}
                  {listing.promoted_flag && (
                    <span className="badge badge-warning promoted-badge">⭐ Promoted</span>
                  )}
                </div>
                
                <div className="listing-content">
                  <h3>{listing.title}</h3>
                  <p className="location">📍 {listing.location}</p>
                  <p className="description">{listing.description.substring(0, 80)}...</p>
                  
                  <div className="listing-footer">
                    <div className="price">
                      <strong>₹{listing.daily_price}/day</strong>
                    </div>
                    <div className="rating">
                      ⭐ {listing.rating} ({listing.total_reviews})
                    </div>
                  </div>
                  
                  {listing.host.gold_host_flag && (
                    <span className="badge badge-warning">⭐ Gold Host</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && listings.length === 0 && (
          <div className="no-results">
            <p>No listings found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
