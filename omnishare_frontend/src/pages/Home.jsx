import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { listingsAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { toast } from 'react-toastify';
import './Home.css';

const demoProducts = [
  { id: 'p1', name: 'Laptop - Dell XPS 13', price: 120, description: 'High-performance ultrabook for professionals', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300' },
  { id: 'p2', name: 'Nikon Camera D3500', price: 80, description: 'Perfect for photography enthusiasts', image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300' },
  { id: 'p3', name: 'Drone - DJI Mavic Air', price: 150, description: 'Compact 4K drone for aerial filming', image: 'https://images.unsplash.com/photo-1509669996-5340aa0ee0c1?w=300' },
  { id: 'p4', name: 'PlayStation 5', price: 50, description: 'Latest gaming console with exclusive games', image: 'https://images.unsplash.com/photo-1535721471918-34fefb025b0f?w=300' },
];

const Home = () => {
  const { addItem } = useCart();
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    min_price: '',
    max_price: '',
  });
  const initializedRef = useRef(false);

  const handleAddToCart = (product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      image: product.image,
    });
    toast.success(`${product.name} added to cart!`);
  };

  const fetchCategories = useCallback(async () => {
    try {
      const response = await listingsAPI.getCategories();
      const cats = response.data?.results || response.data || [];
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  }, []);

  const fetchListings = useCallback(async (queryFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await listingsAPI.getAll(queryFilters);
      const list = response.data?.results || response.data || [];
      setListings(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Listings error:', error);
      setError('Failed to load listings. Please try again.');
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    const initializeHome = async () => {
      await fetchCategories();
      await fetchListings();
    };
    initializeHome();
  }, [fetchCategories, fetchListings]);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleSearch = async () => {
    await fetchListings(filters);
  };

  const handleClearFilters = () => {
    setFilters({
      category: '',
      location: '',
      min_price: '',
      max_price: '',
    });
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="hero">
        <div className="hero-content">
          <h1>Rent Anything, From Anyone, Anywhere</h1>
          <p>Join India's fastest growing P2P rental marketplace</p>
          <div className="hero-search">
            <input
              type="text"
              name="location"
              placeholder="Search by location (e.g., Delhi, Mumbai)..."
              value={filters.location}
              onChange={handleFilterChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="btn btn-primary">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Demo Products Showcase */}
      <div className="products-showcase">
        <div className="container">
          <h2>✨ Featured Products</h2>
          <p>Add these items to your cart and test the payment system</p>
          <div className="products-grid">
            {demoProducts.map((product) => (
              <div key={product.id} className="product-card">
                <img src={product.image} alt={product.name} className="product-image" />
                <div className="product-content">
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="product-footer">
                    <div className="product-price">₹{product.price}</div>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => handleAddToCart(product)}
                    >
                      Add to Cart 🛒
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="products-cta">
            <Link to="/cart" className="btn btn-primary">
              View Shopping Cart
            </Link>
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

        {/* Listings Section */}
        <div className="listings-section">
          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
              <button onClick={() => handleSearch()} className="btn btn-sm btn-secondary">Retry</button>
            </div>
          )}

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading amazing items for you...</p>
            </div>
          ) : listings.length > 0 ? (
            <>
              <div className="listings-header">
                <h2>Found {listings.length} items</h2>
              </div>
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
                      {parseFloat(listing.rating) > 0 && (
                        <div className="rating-badge">⭐ {parseFloat(listing.rating).toFixed(1)}</div>
                      )}
                    </div>
                    
                    <div className="listing-content">
                      <h3>{listing.title}</h3>
                      <div className="listing-meta">
                        <span className="location">📍 {listing.location}</span>
                        <span className="category-badge">{listing.category_name}</span>
                      </div>
                      <p className="listing-description">
                        {listing.description?.substring(0, 60)}...
                      </p>
                      
                      <div className="listing-footer">
                        <div className="listing-price">
                          <div className="price">
                            ₹{listing.daily_price}
                            <span className="price-unit">/day</span>
                          </div>
                        </div>
                        <div className="host-info">
                          <small>{listing.total_reviews} reviews</small>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="no-listings">
              <div className="no-listings-icon">🔍</div>
              <h3>No listings found</h3>
              <p>Try adjusting your filters or explore all items</p>
              <button onClick={handleClearFilters} className="btn btn-primary">
                Clear Filters & Explore
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
