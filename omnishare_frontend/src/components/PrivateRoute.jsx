import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem('access_token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin' && !user.is_staff) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
