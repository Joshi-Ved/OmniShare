import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import './index.css';
import App from './App';
import './services/firebase';

const root = ReactDOM.createRoot(document.getElementById('root'));
const clerkKey =
  process.env.REACT_APP_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  'pk_test_c2ltcGxlLWhlcnJpbmctNC5jbGVyay5hY2NvdW50cy5kZXYk';

root.render(
  <ClerkProvider publishableKey={clerkKey}>
    <App />
  </ClerkProvider>
);
