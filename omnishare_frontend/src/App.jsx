import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
import AllListingsPage from './pages/AllListingsPage';
import NotificationsPage from './pages/NotificationsPage';
import BookingPage from './pages/BookingPage';
import PaymentPage from './pages/PaymentPage';
import CreateListing from './pages/CreateListing';
import KYCSubmission from './pages/KYCSubmission';
import ProfilePage from './pages/ProfilePage';
import ShoppingCart from './pages/ShoppingCart';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmation from './pages/OrderConfirmation';
import CRMPage from './pages/CRMPage';
import SCMPage from './pages/SCMPage';
import DemoCustomerPage from './pages/DemoCustomerPage';
import DemoAdminPage from './pages/DemoAdminPage';

// Components
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import { authAPI } from './services/api';

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.98 }}
    transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/login" element={<Navigate to="/clerk/sign-in" replace />} />
        <Route path="/register" element={<Navigate to="/clerk/sign-up" replace />} />
        <Route path="/clerk/sign-in" element={<PageWrapper><ClerkAuthPage mode="signin" /></PageWrapper>} />
        <Route path="/clerk/sign-up" element={<PageWrapper><ClerkAuthPage mode="signup" /></PageWrapper>} />
        <Route path="/listings/all" element={<PageWrapper><AllListingsPage /></PageWrapper>} />
        <Route path="/notifications" element={<PrivateRoute><PageWrapper><NotificationsPage /></PageWrapper></PrivateRoute>} />
        <Route path="/listings/:id" element={<PageWrapper><ListingDetails /></PageWrapper>} />
        <Route path="/crm" element={<PageWrapper><CRMPage /></PageWrapper>} />
        <Route path="/scm" element={<PageWrapper><SCMPage /></PageWrapper>} />
        <Route path="/demo/customer" element={<PageWrapper><DemoCustomerPage /></PageWrapper>} />
        <Route path="/demo/admin" element={<PageWrapper><DemoAdminPage /></PageWrapper>} />

        {/* Protected Routes */}
        <Route path="/host/dashboard" element={<PrivateRoute><PageWrapper><HostDashboard /></PageWrapper></PrivateRoute>} />
        <Route path="/guest/dashboard" element={<PrivateRoute><PageWrapper><GuestDashboard /></PageWrapper></PrivateRoute>} />
        <Route path="/admin/dashboard" element={<PrivateRoute adminOnly><PageWrapper><AdminDashboard /></PageWrapper></PrivateRoute>} />
        <Route path="/admin/erp" element={<PrivateRoute adminOnly><PageWrapper><ERPDashboard /></PageWrapper></PrivateRoute>} />
        <Route path="/listings/create" element={<PrivateRoute><PageWrapper><CreateListing /></PageWrapper></PrivateRoute>} />
        <Route path="/kyc/submit" element={<PrivateRoute><PageWrapper><KYCSubmission /></PageWrapper></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><PageWrapper><ProfilePage /></PageWrapper></PrivateRoute>} />
        <Route path="/bookings/:id" element={<PrivateRoute><PageWrapper><BookingPage /></PageWrapper></PrivateRoute>} />
        <Route path="/payments/:bookingId" element={<PrivateRoute><PageWrapper><PaymentPage /></PageWrapper></PrivateRoute>} />

        {/* Shopping Cart Routes */}
        <Route path="/cart" element={<PageWrapper><ShoppingCart /></PageWrapper>} />
        <Route path="/checkout" element={<PageWrapper><CheckoutPage /></PageWrapper>} />
        <Route path="/order-confirmation" element={<PageWrapper><OrderConfirmation /></PageWrapper>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

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

        <AnimatedRoutes />
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
