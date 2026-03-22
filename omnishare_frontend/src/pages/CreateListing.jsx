import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import { listingsAPI } from '../services/api';
import { toast } from 'react-toastify';
import 'leaflet/dist/leaflet.css';
import './CreateListing.css';

const DEFAULT_MAP_CENTER = [20.5937, 78.9629];

const LocationPicker = ({ selectedPosition, onLocationPick }) => {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      onLocationPick(lat, lng);
    },
  });

  if (!selectedPosition) {
    return null;
  }

  return <CircleMarker center={selectedPosition} radius={9} pathOptions={{ color: '#0077b6', fillColor: '#00a6fb', fillOpacity: 0.7 }} />;
};

const RecenterMap = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);

  return null;
};

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
    latitude: '',
    longitude: '',
    availability_start: '',
    availability_end: '',
  });
  const [listingImage, setListingImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedPosition =
    formData.latitude && formData.longitude
      ? [parseFloat(formData.latitude), parseFloat(formData.longitude)]
      : null;

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const fetchCategories = async () => {
    try {
      const response = await listingsAPI.getCategories();
      
      // Handle paginated response from DRF
      const categoriesData = response.data.results || response.data;
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setListingImage(null);
      setImagePreview('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setListingImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const reverseGeocode = async (latitude, longitude) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch location');
    }

    const data = await response.json();
    const place = data?.display_name || '';
    const shortLocation = [data?.address?.city, data?.address?.state, data?.address?.country]
      .filter(Boolean)
      .join(', ');

    setFormData((prev) => ({
      ...prev,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      location: shortLocation || place || prev.location,
      address: prev.address || place,
    }));
  };

  const handleMapLocationPick = async (latitude, longitude) => {
    try {
      setLocationLoading(true);
      setMapCenter([latitude, longitude]);
      await reverseGeocode(latitude, longitude);
      toast.success('Location selected from map');
    } catch (error) {
      setFormData((prev) => ({
        ...prev,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
      }));
      toast.info('Coordinates selected. Add location text manually if needed.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await handleMapLocationPick(latitude, longitude);
      },
      () => {
        setLocationLoading(false);
        toast.error('Unable to fetch your current location');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Creating listing with data:', formData);
      console.log('Auth token:', localStorage.getItem('access_token'));
      console.log('User:', JSON.parse(localStorage.getItem('user') || '{}'));
      
      const createResponse = await listingsAPI.create(formData);
      const createdListing = createResponse?.data;

      if (listingImage && createdListing?.id) {
        try {
          const imageFormData = new FormData();
          imageFormData.append('image', listingImage);
          imageFormData.append('is_primary', 'true');
          imageFormData.append('caption', `${formData.title} image`);
          console.log('Uploading image for listing:', createdListing.id);
          const imageResponse = await listingsAPI.uploadImage(createdListing.id, imageFormData);
          console.log('Image upload response:', imageResponse);
          toast.success('Listing and image uploaded successfully! Awaiting admin verification.');
        } catch (imageError) {
          console.error('Image upload error:', imageError);
          console.error('Image error response:', imageError.response);
          toast.warning('Listing created but image upload may have failed. Check in your dashboard.');
        }
      } else {
        toast.success('Listing created successfully! Awaiting admin verification.');
      }

      navigate('/host/dashboard');
    } catch (error) {
      console.error('Create listing error:', error);
      console.error('Error response:', error.response);

      const statusCode = error.response?.status;
      const errors = error.response?.data;

      if (statusCode === 403) {
        toast.error('Only KYC-verified host accounts can create listings. Complete KYC and switch to host/both role.');
      } else if (typeof errors === 'string') {
        toast.error(errors);
      } else if (errors?.detail) {
        toast.error(errors.detail);
      } else if (errors && typeof errors === 'object') {
        const keys = Object.keys(errors);
        if (keys.length === 0) {
          toast.error('Failed to create listing');
        } else {
          keys.forEach((key) => {
            const value = errors[key];
            if (Array.isArray(value) && value.length > 0) {
              toast.error(`${key}: ${value[0]}`);
            } else if (typeof value === 'string') {
              toast.error(`${key}: ${value}`);
            }
          });
        }
      } else if (error.request) {
        toast.error('Backend is not reachable. Please ensure server is running on port 8001.');
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
                  {Array.isArray(categories) && categories.map((cat) => (
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
                <div className="location-helper-row">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleUseCurrentLocation}
                    disabled={locationLoading}
                  >
                    {locationLoading ? 'Fetching...' : 'Use Current Location'}
                  </button>
                  {selectedPosition && (
                    <span className="coords-text">
                      {formData.latitude}, {formData.longitude}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Pick Location from Map</label>
              <div className="location-map-wrap">
                <MapContainer center={mapCenter} zoom={5} scrollWheelZoom style={{ height: '280px', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <RecenterMap center={mapCenter} />
                  <LocationPicker selectedPosition={selectedPosition} onLocationPick={handleMapLocationPick} />
                </MapContainer>
              </div>
              <small className="image-help-text">Click anywhere on the map to set listing location.</small>
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

            <div className="form-group">
              <label>Listing Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <small className="image-help-text">Optional. JPG/PNG/WebP up to 5MB.</small>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Listing preview"
                  className="listing-image-preview"
                />
              )}
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