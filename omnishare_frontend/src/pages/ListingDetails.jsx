import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listingsAPI, bookingsAPI } from '../services/api';
import { toast } from 'react-toastify';
import './ListingDetails.css';

const ListingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingDates, setBookingDates] = useState({
    start_date: '',
    end_date: '',
  });
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    fetchListing();
    fetchReviews();
  }, [id]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [listing?.id]);

  const fetchListing = async () => {
    setLoading(true);
    try {
      const response = await listingsAPI.getById(id);
      setListing(response.data);
    } catch (error) {
      toast.error('Failed to load listing');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await listingsAPI.getReviews(id);
      setReviews(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to load reviews');
    }
  };

  const handleDateChange = (e) => {
    setBookingDates({
      ...bookingDates,
      [e.target.name]: e.target.value,
    });
  };

  const calculatePrice = async () => {
    if (!bookingDates.start_date || !bookingDates.end_date) {
      toast.error('Please select both dates');
      return;
    }

    try {
      const response = await bookingsAPI.calculatePrice({
        listing_id: listing.id,
        start_date: bookingDates.start_date,
        end_date: bookingDates.end_date,
      });
      setPriceBreakdown(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to calculate price');
    }
  };

  const handleBooking = async () => {
    if (!localStorage.getItem('access_token')) {
      toast.error('Please login to book');
      navigate('/login');
      return;
    }

    if (!bookingDates.start_date || !bookingDates.end_date) {
      toast.error('Please select dates');
      return;
    }

    try {
      const response = await bookingsAPI.create({
        listing: listing.id,
        start_date: bookingDates.start_date,
        end_date: bookingDates.end_date,
        insurance_fee: priceBreakdown?.insurance_fee || 0,
      });
      
      toast.success('Booking created! Proceeding to payment...');
      navigate(`/bookings/${response.data.booking.id}`);
    } catch (error) {
      const payload = error.response?.data;
      let errorMsg = 'Failed to create booking';

      if (typeof payload === 'string') {
        errorMsg = payload;
      } else if (payload?.error) {
        errorMsg = Array.isArray(payload.error) ? payload.error[0] : payload.error;
      } else if (payload?.non_field_errors?.length) {
        errorMsg = payload.non_field_errors[0];
      } else if (payload?.dates) {
        errorMsg = Array.isArray(payload.dates) ? payload.dates[0] : payload.dates;
      } else if (payload?.listing) {
        errorMsg = Array.isArray(payload.listing) ? payload.listing[0] : payload.listing;
      } else if (payload?.start_date) {
        errorMsg = Array.isArray(payload.start_date) ? payload.start_date[0] : payload.start_date;
      } else if (payload?.end_date) {
        errorMsg = Array.isArray(payload.end_date) ? payload.end_date[0] : payload.end_date;
      } else if (payload && typeof payload === 'object') {
        const firstValue = Object.values(payload)[0];
        if (Array.isArray(firstValue) && firstValue.length) {
          errorMsg = firstValue[0];
        } else if (typeof firstValue === 'string') {
          errorMsg = firstValue;
        }
      }

      toast.error(errorMsg);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!listing) return null;

  const listingImages = listing.images || [];
  const activeImage = listingImages[activeImageIndex]?.image;

  return (
    <div className="listing-details-page">
      <div className="container">
        <div className="listing-images">
          {listingImages.length > 0 ? (
            <div className="image-gallery">
              <img src={activeImage} alt={listing.title} className="main-image" />
              {listingImages.length > 1 && (
                <div className="thumb-row">
                  {listingImages.map((imageItem, index) => (
                    <button
                      key={imageItem.id || index}
                      type="button"
                      className={`thumb-btn ${activeImageIndex === index ? 'active' : ''}`}
                      onClick={() => setActiveImageIndex(index)}
                    >
                      <img src={imageItem.image} alt={`${listing.title} ${index + 1}`} className="thumb-img" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="no-image-large">No Image Available</div>
          )}
        </div>

        <div className="listing-content grid grid-2">
          <div className="listing-info">
            <h1>{listing.title}</h1>
            <p className="location">📍 {listing.location}</p>
            <div className="listing-quick-tags">
              <span className="quick-tag">✅ Verified Listing</span>
              <span className="quick-tag">🔒 Secure Payment</span>
              <span className="quick-tag">⏱️ Daily Rental</span>
            </div>
            
            <div className="host-info card">
              <h3>Hosted by {listing.host.username}</h3>
              <p>Trust Score: ⭐ {listing.host.trust_score}/5</p>
              <p>Completed Bookings: {listing.host.successful_bookings}</p>
              {listing.host.gold_host_flag && (
                <span className="badge badge-warning">⭐ Gold Host</span>
              )}
            </div>

            <div className="description card">
              <h3>Description</h3>
              <p>{listing.description}</p>
            </div>

            <div className="listing-details card">
              <h3>Details</h3>
              <p><strong>Category:</strong> {listing.category_name}</p>
              <p><strong>Daily Price:</strong> ₹{listing.daily_price}</p>
              <p><strong>Security Deposit:</strong> ₹{listing.deposit}</p>
              <p><strong>Rating:</strong> ⭐ {listing.rating} ({listing.total_reviews} reviews)</p>
              <p><strong>Total Bookings:</strong> {listing.total_bookings}</p>
            </div>

            <div className="reviews card">
              <h3>Reviews</h3>
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="review">
                    <div className="review-header">
                      <strong>{review.reviewer_name}</strong>
                      <span>⭐ {review.rating}/5</span>
                    </div>
                    <p>{review.comment}</p>
                    <small>{new Date(review.created_at).toLocaleDateString()}</small>
                  </div>
                ))
              ) : (
                <p>No reviews yet</p>
              )}
            </div>
          </div>

          <div className="booking-widget">
            <div className="card">
              <h2>Book This Item</h2>
              <p className="booking-subtitle">Choose your dates to see the exact rental total.</p>

              <div className="booking-top-price">
                <span className="booking-price">₹{listing.daily_price}</span>
                <span className="booking-price-unit">per day</span>
              </div>
              
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={bookingDates.start_date}
                  onChange={handleDateChange}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  name="end_date"
                  value={bookingDates.end_date}
                  onChange={handleDateChange}
                  min={bookingDates.start_date}
                />
              </div>

              <button onClick={calculatePrice} className="btn btn-secondary">
                Calculate Price
              </button>

              {priceBreakdown && (
                <div className="price-breakdown">
                  <h3>Price Breakdown</h3>
                  <div className="price-row">
                    <span>₹{priceBreakdown.daily_price} × {priceBreakdown.rental_days} days</span>
                    <span>₹{priceBreakdown.rental_amount}</span>
                  </div>
                  <div className="price-row">
                    <span>Service Fee (6%)</span>
                    <span>₹{priceBreakdown.commission_guest}</span>
                  </div>
                  <div className="price-row">
                    <span>Insurance</span>
                    <span>₹{priceBreakdown.insurance_fee}</span>
                  </div>
                  <div className="price-row">
                    <span>Security Deposit (refundable)</span>
                    <span>₹{priceBreakdown.deposit}</span>
                  </div>
                  <hr />
                  <div className="price-row total">
                    <strong>Total</strong>
                    <strong>₹{priceBreakdown.guest_total}</strong>
                  </div>
                </div>
              )}

              <button
                onClick={handleBooking}
                className="btn btn-primary"
                disabled={!priceBreakdown}
              >
                Continue to Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetails;
