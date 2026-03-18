import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import './Auth.css';

const ClerkAuthPage = ({ mode = 'signin' }) => {
  const location = useLocation();
  const publishableKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return <Navigate to={mode === 'signup' ? '/register' : '/login'} replace state={{ from: location }} />;
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card card">
          {mode === 'signup' ? (
            <SignUp routing="path" path="/clerk/sign-up" signInUrl="/clerk/sign-in" />
          ) : (
            <SignIn routing="path" path="/clerk/sign-in" signUpUrl="/clerk/sign-up" />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClerkAuthPage;
