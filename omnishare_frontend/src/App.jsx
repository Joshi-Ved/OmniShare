import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Providers
import { CartProvider } from './context/CartContext';

// Pages
import Home from './pages/Home';
import ClerkAuthPage from './pages/ClerkAuthPage';
import HostDashboard from './pages/HostDashboard';
import GuestDashboard from './pages/GuestDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ListingDetails from './pages/ListingDetails';
import BookingPage from './pages/BookingPage';
import PaymentPage from './pages/PaymentPage';
import CreateListing from './pages/CreateListing';
import KYCSubmission from './pages/KYCSubmission';
import ProfilePage from './pages/ProfilePage';
import ShoppingCart from './pages/ShoppingCart';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmation from './pages/OrderConfirmation';

// Components
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <CartProvider>
      <Router>
        <div className="App">
          <Navbar />
          <ToastContainer position="top-right" autoClose={3000} />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Navigate to="/clerk/sign-in" replace />} />
          <Route path="/register" element={<Navigate to="/clerk/sign-up" replace />} />
          <Route path="/clerk/sign-in" element={<ClerkAuthPage mode="signin" />} />
          <Route path="/clerk/sign-up" element={<ClerkAuthPage mode="signup" />} />
          <Route path="/listings/:id" element={<ListingDetails />} />
          
          {/* Protected Routes */}
          <Route path="/host/dashboard" element={
            <PrivateRoute>
              <HostDashboard />
            </PrivateRoute>
          } />
          
          <Route path="/guest/dashboard" element={
            <PrivateRoute>
              <GuestDashboard />
            </PrivateRoute>
          } />
          
          <Route path="/admin/dashboard" element={
            <PrivateRoute adminOnly>
              <AdminDashboard />
            </PrivateRoute>
          } />
          
          <Route path="/listings/create" element={
            <PrivateRoute>
              <CreateListing />
            </PrivateRoute>
          } />
          
          <Route path="/kyc/submit" element={
            <PrivateRoute>
              <KYCSubmission />
            </PrivateRoute>
          } />

          <Route path="/profile" element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          } />
          
          <Route path="/bookings/:id" element={
            <PrivateRoute>
              <BookingPage />
            </PrivateRoute>
          } />

          <Route path="/payments/:bookingId" element={
            <PrivateRoute>
              <PaymentPage />
            </PrivateRoute>
          } />

          {/* Shopping Cart Routes */}
          <Route path="/cart" element={<ShoppingCart />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          
          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
    </CartProvider>
  );
}

export default App;
