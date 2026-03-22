import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Providers
import { CartProvider } from './context/CartContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Pages
import Home from './pages/Home';
import ClerkAuthPage from './pages/ClerkAuthPage';
import HostDashboard from './pages/HostDashboard';
import GuestDashboard from './pages/GuestDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ERPDashboard from './pages/ERPDashboard';
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
import { authAPI } from './services/api';

function AppContent() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const didSyncRef = useRef(false);
  const syncKeyRef = useRef('');
  const clerkId = clerkUser?.id || '';
  const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress || '';
  const clerkUsername = clerkUser?.username || '';
  const clerkFirstName = clerkUser?.firstName || '';
  const clerkLastName = clerkUser?.lastName || '';

  useEffect(() => {
    const syncAuth = async () => {
      if (!isLoaded) return;

      if (!isSignedIn) {
        didSyncRef.current = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        syncKeyRef.current = '';
        return;
      }

      const existingToken = localStorage.getItem('access_token');
      const existingUser = localStorage.getItem('user');
      if (existingToken && existingUser) {
        didSyncRef.current = true;
        return;
      }

      if (didSyncRef.current) return;

      const syncKey = `${clerkId}:${clerkEmail}`;
      if (syncKey && syncKeyRef.current === syncKey) return;
      syncKeyRef.current = syncKey;
      didSyncRef.current = true;

      try {
        const email = clerkEmail;
        const username = clerkUsername || clerkId || email;

        if (!email) return;

        const response = await authAPI.clerkSyncLogin({
          email,
          username,
          first_name: clerkFirstName,
          last_name: clerkLastName,
        });

        if (response?.data?.access_token) {
          localStorage.setItem('access_token', response.data.access_token);
        }

        if (response?.data?.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      } catch (error) {
        console.error('Failed to sync Clerk login with backend token', error);
        didSyncRef.current = false;
        syncKeyRef.current = '';
      }
    };

    syncAuth();
  }, [isLoaded, isSignedIn, clerkId, clerkEmail, clerkUsername, clerkFirstName, clerkLastName]);

  return (
    <Router>
      <div className="App" data-theme={theme}>
        <Navbar isDark={isDark} onToggleTheme={toggleTheme} />
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
          
          <Route path="/admin/erp" element={
            <PrivateRoute adminOnly>
              <ERPDashboard />
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
  );
}

function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;
