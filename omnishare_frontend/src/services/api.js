import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/users/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/users/register/', data),
  login: (data) => api.post('/users/login/', data),
  getProfile: () => api.get('/users/profile/'),
  updateProfile: (data) => api.put('/users/profile/', data),
  submitKYC: (formData) => api.post('/users/kyc/submit/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Listings API
export const listingsAPI = {
  getAll: (params) => api.get('/listings/', { params }),
  getById: (id) => api.get(`/listings/${id}/`),
  create: (data) => api.post('/listings/create/', data),
  update: (id, data) => api.put(`/listings/${id}/update/`, data),
  delete: (id) => api.delete(`/listings/${id}/delete/`),
  getMyListings: () => api.get('/listings/my-listings/'),
  uploadImage: (listingId, formData) => 
    api.post(`/listings/${listingId}/images/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getCategories: () => api.get('/listings/categories/'),
  getReviews: (listingId) => api.get(`/listings/${listingId}/reviews/`),
};

// Bookings API
export const bookingsAPI = {
  create: (data) => api.post('/bookings/create/', data),
  getMyBookings: (role) => api.get('/bookings/my-bookings/', { params: { role } }),
  getById: (id) => api.get(`/bookings/${id}/`),
  confirm: (id) => api.post(`/bookings/${id}/confirm/`),
  handover: (data) => api.post('/bookings/handover/', data),
  return: (data) => api.post('/bookings/return/', data),
  complete: (id) => api.post(`/bookings/${id}/complete/`),
  calculatePrice: (data) => api.post('/bookings/calculate-price/', data),
  getBlockedDates: (listingId) => api.get(`/bookings/blocked-dates/${listingId}/`),
  raiseDispute: (data) => api.post('/bookings/raise-dispute/', data),
  cancel: (data) => api.post('/bookings/cancel/', data),
};

// Payments API
export const paymentsAPI = {
  createOrder: (bookingId) => api.post(`/payments/create-order/${bookingId}/`),
  verifyPayment: (data) => api.post('/payments/verify/', data),
  getTransactions: () => api.get('/payments/transactions/'),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/crm/dashboard/'),
  getRevenueReport: (params) => api.get('/crm/revenue-report/', { params }),
  verifyListing: (data) => api.post('/listings/verify/', data),
  getPendingListings: () => api.get('/listings/pending/'),
  getPendingKYC: () => api.get('/users/kyc/pending/'),
  verifyKYC: (data) => api.post('/users/kyc/verify/', data),
  getDisputedBookings: () => api.get('/bookings/disputed/'),
  resolveDispute: (data) => api.post('/bookings/resolve-dispute/', data),
};

// Marketing API
export const marketingAPI = {
  captureLead: (data) => api.post('/marketing/leads/capture/', data),
  getReferralCode: () => api.get('/marketing/referral-code/'),
  getReferralStats: () => api.get('/marketing/referral-stats/'),
};

export default api;
