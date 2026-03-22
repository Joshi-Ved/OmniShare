import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';

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
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle API errors (no JWT refresh flow in Firebase-only auth mode)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/users/register/', data),
  login: (data) => api.post('/users/login/', data),
  clerkSyncLogin: (data) => api.post('/users/clerk-sync-login/', data),
  logout: () => api.post('/users/logout/'),
  getProfile: () => api.get('/users/profile/'),
  updateProfile: (data) => api.put('/users/profile/', data),
  submitKYC: (formData) => api.patch('/users/kyc/submit/', formData, {
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
  checkoutPreview: (bookingId) => api.post('/payments/payments/checkout-preview/', { booking_id: bookingId }),
  createOrder: (bookingId) => api.post('/payments/payments/create-order/', { booking_id: bookingId }),
  createStripeSession: (bookingId) => api.post('/payments/payments/stripe-create-session/', { booking_id: bookingId }),
  demoCompletePayment: (bookingId) => api.post('/payments/payments/demo-complete/', { booking_id: bookingId }),
  verifyPayment: (data) => api.post('/payments/payments/verify/', data),
  verifyStripeSession: (data) => api.post('/payments/payments/stripe-verify-session/', data),
  refund: (data) => api.post('/payments/payments/refund/', data),
  getTransactions: (params) => api.get('/payments/payments/transactions/', { params }),
  getSettlements: () => api.get('/payments/payments/settlements/'),
  getInvoices: () => api.get('/payments/invoices/'),
  downloadInvoice: (invoiceId) => api.get(`/payments/invoices/${invoiceId}/download/`, { responseType: 'blob' }),
  resendInvoice: (invoiceId) => api.post(`/payments/invoices/${invoiceId}/resend_email/`),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/crm/dashboard/'),
  getRevenueReport: (params) => api.get('/crm/revenue-report/', { params }),
  getSalesReport: (params) => api.get('/crm/sales-report/', { params }),
  getInventoryLinkage: (params) => api.get('/crm/inventory-linkage/', { params }),
  getSCMDashboard: (params) => api.get('/crm/scm-dashboard/', { params }),
  getDecisionSupport: () => api.get('/crm/decision-support/'),
  getCustomers: (params) => api.get('/crm/customers/', { params }),
  getCustomerDetail: (userId) => api.get(`/crm/customers/${userId}/`),
  verifyListing: (data) => api.post('/listings/verify/', data),
  getPendingListings: () => api.get('/listings/pending/'),
  getPendingKYC: () => api.get('/users/kyc/pending/'),
  verifyKYC: (data) => api.post('/users/kyc/verify/', data),
  getDisputedBookings: () => api.get('/bookings/disputed/'),
  getOrders: (params) => api.get('/bookings/admin/orders/', { params }),
  resolveDispute: (data) => api.post('/bookings/resolve-dispute/', data),
};

// Marketing API
export const marketingAPI = {
  captureLead: (data) => api.post('/marketing/leads/capture/', data),
  getReferralCode: () => api.get('/marketing/referral-code/'),
  getReferralStats: () => api.get('/marketing/referral-stats/'),
};

export default api;
