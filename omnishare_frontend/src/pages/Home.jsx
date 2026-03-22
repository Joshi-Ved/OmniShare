import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { listingsAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { toast } from 'react-toastify';
import './Home.css';

const demoProducts = [
  {
    id: 'p1',
    name: 'Laptop - Dell XPS 13',
    price: 120,
    description: 'High-performance ultrabook for professionals',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p2',
    name: 'Nikon Camera D3500',
    price: 80,
    description: 'Perfect for photography enthusiasts',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p3',
    name: 'Drone - DJI Mavic Air',
    price: 150,
    description: 'Compact 4K drone for aerial filming',
    image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p4',
    name: 'PlayStation 5',
    price: 50,
    description: 'Latest gaming console with exclusive games',
    image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p5',
    name: 'GoPro Hero 12',
    price: 65,
    description: 'Action camera for travel, biking, and adventure shoots',
    image: '/images/image.png',
  },
  {
    id: 'p6',
    name: 'Road Bike - Giant Escape',
    price: 95,
    description: 'Lightweight city bike perfect for daily commutes',
    image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p7',
    name: 'Portable Projector',
    price: 70,
    description: 'Compact HD projector for presentations and movie nights',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p8',
    name: 'Camping Tent - 4 Person',
    price: 110,
    description: 'Weather-resistant family tent for weekend getaways',
    image: 'https://images.unsplash.com/photo-1487730116645-74489c95b41b?auto=format&fit=crop&w=1200&q=80',
  },
];

const heroSlides = [
  {
    id: 's1',
    image: 'https://images.unsplash.com/photo-1465800872432-80a117de8f9a?auto=format&fit=crop&w=2200&q=80',
    label: 'City Rentals',
  },
  {
    id: 's2',
    image: 'https://images.unsplash.com/photo-1498049860654-af1a5c566876?auto=format&fit=crop&w=2200&q=80',
    label: 'Tech On Demand',
  },
  {
    id: 's3',
    image: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=2200&q=80',
    label: 'Event Essentials',
  },
  {
    id: 's4',
    image: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=2200&q=80',
    label: 'Weekend Adventure Gear',
  },
  {
    id: 's5',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=2200&q=80',
    label: 'Creator Equipment',
  },
  {
    id: 's6',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2200&q=80',
    label: 'Workspace Rentals',
  },
  {
    id: 's7',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=2200&q=80',
    label: 'Home Essentials',
  },
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
  const [imageModal, setImageModal] = useState({
    isOpen: false,
    src: '',
    title: '',
  });
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const initializedRef = useRef(false);
  const promotedCount = listings.filter((item) => item.promoted_flag).length;

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

  const openImageModal = (src, title) => {
    setImageModal({
      isOpen: true,
      src,
      title,
    });
  };

  const closeImageModal = () => {
    setImageModal({
      isOpen: false,
      src: '',
      title: '',
    });
  };

  useEffect(() => {
    if (!imageModal.isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeImageModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageModal.isOpen]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 7000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const preloadedImages = heroSlides.map((slide) => {
      const image = new window.Image();
      image.src = slide.image;
      return image;
    });

    return () => {
      preloadedImages.forEach((image) => {
        image.src = '';
      });
    };
  }, []);

  useEffect(() => {
    const handleHeroKeyDown = (event) => {
      if (event.key === 'ArrowRight') {
        setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length);
      }

      if (event.key === 'ArrowLeft') {
        setActiveHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
      }
    };

    window.addEventListener('keydown', handleHeroKeyDown);
    return () => window.removeEventListener('keydown', handleHeroKeyDown);
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="hero">
        <div className="hero-bg" aria-hidden="true">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`hero-bg-slide ${index === activeHeroSlide ? 'active' : ''}`}
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          ))}
        </div>
        <button
          type="button"
          className="hero-nav hero-nav-prev"
          onClick={() => setActiveHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
          aria-label="Previous hero slide"
        >
          ‹
        </button>
        <button
          type="button"
          className="hero-nav hero-nav-next"
          onClick={() => setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length)}
          aria-label="Next hero slide"
        >
          ›
        </button>
        <div className="hero-slide-caption" aria-live="polite">
          {heroSlides[activeHeroSlide].label}
        </div>
        <div className="hero-slide-dots" aria-label="Hero image slideshow controls">
          {heroSlides.map((_, index) => (
            <button
              key={`hero-dot-${index}`}
              type="button"
              className={`hero-dot ${index === activeHeroSlide ? 'active' : ''}`}
              onClick={() => setActiveHeroSlide(index)}
              aria-label={`Show slide ${index + 1}`}
            />
          ))}
        </div>
        <div className="hero-content">
          <h1>Find Trusted Rentals Near You</h1>
          <p>Discover verified hosts, transparent pricing, and hassle-free bookings across India.</p>
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
              Browse Rentals
            </button>
          </div>
          <div className="hero-trust-row">
            <span className="hero-pill">Verified Hosts</span>
            <span className="hero-pill">Secure Payments</span>
            <span className="hero-pill">Real Reviews</span>
          </div>
        </div>
      </div>

      <div className="market-stats-wrap">
        <div className="container">
          <div className="market-stats grid grid-4">
            <div className="market-stat card">
              <h4>Live Listings</h4>
              <p>{listings.length || '0'}</p>
            </div>
            <div className="market-stat card">
              <h4>Promoted</h4>
              <p>{promotedCount || '0'}</p>
            </div>
            <div className="market-stat card">
              <h4>Categories</h4>
              <p>{categories.length || '0'}</p>
            </div>
            <div className="market-stat card">
              <h4>Booking Model</h4>
              <p>Per Day</p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Products Showcase */}
      <div className="products-showcase">
        <div className="container">
          <h2>Popular Rental Picks</h2>
          <p>Trending items renters book most for work, travel, and events.</p>
          <div className="products-grid">
            {demoProducts.map((product) => (
              <div key={product.id} className="product-card">
                <img src={product.image} alt={product.name} className="product-image" loading="lazy" />
                <div className="product-content">
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="product-footer">
                    <div className="product-price">₹{product.price}</div>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => handleAddToCart(product)}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="products-cta">
            <Link to="/cart" className="btn btn-primary">
              View Cart
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container">
        <div className="filters">
          <div className="filters-head">
            <h3>Refine Results</h3>
            <button onClick={handleClearFilters} className="btn btn-sm btn-secondary" type="button">
              Reset
            </button>
          </div>
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
              Apply Filters
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
                <h2>{listings.length} rentals available</h2>
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

                      <div className="listing-signal-row">
                        <span className="signal-chip">⚡ Fast Booking</span>
                        <span className="signal-chip">🛡️ Secure</span>
                      </div>
                      
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

                      <div className="listing-actions">
                        <span className="view-hint">Tap card for full details</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (listing.primary_image) {
                              openImageModal(listing.primary_image, listing.title);
                            } else {
                              toast.info('No image available for this listing');
                            }
                          }}
                        >
                          View Image
                        </button>
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

      {imageModal.isOpen && (
        <div className="image-modal-backdrop" onClick={closeImageModal}>
          <div className="image-modal" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>{imageModal.title}</h3>
              <button type="button" className="image-modal-close" onClick={closeImageModal}>
                ✕
              </button>
            </div>
            <img src={imageModal.src} alt={imageModal.title || 'Listing image'} className="image-modal-img" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
