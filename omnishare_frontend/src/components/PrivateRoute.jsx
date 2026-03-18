import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Navigate to="/clerk/sign-in" replace />;
  }

  if (adminOnly && user.role !== 'admin' && !user.is_staff) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
