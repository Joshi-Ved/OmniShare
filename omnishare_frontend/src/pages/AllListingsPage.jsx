import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listingsAPI } from '../services/api';
import { toast } from 'react-toastify';
import './Home.css';
import './AllListingsPage.css';

const PAGE_SIZE = 9;

const AllListingsPage = () => {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    min_price: '',
    max_price: '',
    min_rating: '',
    gold_host: false,
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    document.title = 'All Listings | OmniShare Rentals';
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [listingsResponse, categoriesResponse] = await Promise.all([
          listingsAPI.getAll(),
          listingsAPI.getCategories(),
        ]);

        const allListings = listingsResponse.data?.results || listingsResponse.data || [];
        const categoryList = categoriesResponse.data?.results || categoriesResponse.data || [];

        if (!isActive) {
          return;
        }

        setListings(Array.isArray(allListings) ? allListings : []);
        setCategories(Array.isArray(categoryList) ? categoryList : []);
      } catch (error) {
        console.error('Failed to load listings page:', error);
        toast.error('Failed to load listings');
        if (isActive) {
          setListings([]);
          setCategories([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isActive = false;
    };
  }, []);

  const handleFilterChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      location: '',
      min_price: '',
      max_price: '',
      min_rating: '',
      gold_host: false,
    });
    setCurrentPage(1);
  };

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const categoryMatch = !filters.category || listing.category_name?.toLowerCase() === filters.category.toLowerCase();
      const locationMatch = !filters.location || listing.location?.toLowerCase().includes(filters.location.toLowerCase());
      const minPriceMatch = !filters.min_price || Number(listing.daily_price) >= Number(filters.min_price);
      const maxPriceMatch = !filters.max_price || Number(listing.daily_price) <= Number(filters.max_price);
      const minRatingMatch = !filters.min_rating || Number(listing.rating) >= Number(filters.min_rating);
      const goldHostMatch = !filters.gold_host || Boolean(listing.host?.gold_host_flag);

      return categoryMatch && locationMatch && minPriceMatch && maxPriceMatch && minRatingMatch && goldHostMatch;
    });
  }, [filters, listings]);

  useEffect(() => {
    if (currentPage > 1 && (currentPage - 1) * PAGE_SIZE >= filteredListings.length) {
      setCurrentPage(1);
    }
  }, [currentPage, filteredListings.length]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE));
  const paginatedListings = filteredListings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="all-listings-page">
      <div className="container all-listings-shell">
        <div className="all-listings-hero card">
          <div>
            <span className="all-listings-kicker">Marketplace</span>
            <h1>All Listings</h1>
            <p>
              Browse the full rental catalog with filters and pagination when the homepage preview is not enough.
            </p>
          </div>
          <div className="all-listings-summary">
            <div className="summary-card">
              <strong>{filteredListings.length}</strong>
              <span>Listings Found</span>
            </div>
            <div className="summary-card">
              <strong>{categories.length}</strong>
              <span>Categories</span>
            </div>
          </div>
        </div>

        <div className="filters card">
          <div className="filters-head">
            <h3>Refine Results</h3>
            <button onClick={clearFilters} className="btn btn-sm btn-secondary" type="button">
              Reset
            </button>
          </div>
          <div className="filters-grid all-listings-filters">
            <div className="form-group">
              <label>Category</label>
              <select name="category" value={filters.category} onChange={handleFilterChange}>
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
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
                placeholder="Search city or area"
              />
            </div>

            <div className="form-group">
              <label>Min Price</label>
              <input
                type="number"
                name="min_price"
                value={filters.min_price}
                onChange={handleFilterChange}
                placeholder="Min"
              />
            </div>

            <div className="form-group">
              <label>Max Price</label>
              <input
                type="number"
                name="max_price"
                value={filters.max_price}
                onChange={handleFilterChange}
                placeholder="Max"
              />
            </div>

            <div className="form-group">
              <label>Min Rating</label>
              <input
                type="number"
                name="min_rating"
                value={filters.min_rating}
                onChange={handleFilterChange}
                placeholder="4.5"
                step="0.1"
                min="0"
                max="5"
              />
            </div>

            <label className="checkbox-chip">
              <input
                type="checkbox"
                name="gold_host"
                checked={filters.gold_host}
                onChange={handleFilterChange}
              />
              Gold hosts only
            </label>
          </div>
        </div>

        {loading ? (
          <div className="loading-container card">
            <div className="spinner"></div>
            <p>Loading listings...</p>
          </div>
        ) : filteredListings.length > 0 ? (
          <>
            <div className="listings-header all-listings-header">
              <div>
                <h2>Showing page {currentPage} of {totalPages}</h2>
                <p>{filteredListings.length} listings match your filters.</p>
              </div>
              <Link to="/" className="btn btn-secondary">
                Back to Home
              </Link>
            </div>

            <div className="listings-grid grid grid-3">
              {paginatedListings.map((listing) => (
                <Link to={`/listings/${listing.id}`} key={listing.id} className="listing-card">
                  <div className="listing-image-wrapper">
                    {listing.primary_image ? (
                      <img src={listing.primary_image} alt={listing.title} className="listing-image" />
                    ) : (
                      <div className="no-image">📦</div>
                    )}
                    {listing.promoted_flag && <span className="promoted-badge">⭐ Promoted</span>}
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

            {totalPages > 1 && (
              <div className="pagination-bar card">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <div className="pagination-status">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-listings card">
            <div className="no-listings-icon">🔍</div>
            <h3>No listings found</h3>
            <p>Try clearing the filters or go back to the homepage preview.</p>
            <div className="empty-actions">
              <button onClick={clearFilters} className="btn btn-primary" type="button">
                Clear Filters
              </button>
              <Link to="/" className="btn btn-secondary">
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllListingsPage;
