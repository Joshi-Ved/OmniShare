import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Show loading spinner while Clerk is loading
  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p>Loading...</p>
        </div>
      </div>
    );
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
