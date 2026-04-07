import React from 'react';
import { Link } from 'react-router-dom';
import './DemoShowcase.css';

const featuredItems = [
  {
    title: 'Creator Gear Bundle',
    category: 'Electronics',
    price: 'Rs 1,999/day',
    rating: '4.8',
    tag: 'High Demand',
  },
  {
    title: 'Weekend Adventure Kit',
    category: 'Outdoor',
    price: 'Rs 1,250/day',
    rating: '4.6',
    tag: 'Family Pick',
  },
  {
    title: 'Event Lighting Pro Set',
    category: 'Events',
    price: 'Rs 2,450/day',
    rating: '4.9',
    tag: 'Top Rated',
  },
  {
    title: 'Pro Workstation Laptop',
    category: 'Work',
    price: 'Rs 1,450/day',
    rating: '4.7',
    tag: 'Fast Booking',
  },
];

const trustSignals = [
  'KYC-verified hosts and guests only',
  'Insurance-protected rentals with plan options',
  'Escrow-like payment control and audit trails',
  'Issue escalation within 24 hours for priority disputes',
];

const DemoCustomerPage = () => {
  return (
    <div className="demo-shell demo-customer">
      <section className="demo-hero">
        <div className="demo-hero-text">
          <p className="demo-eyebrow">OmniShare Marketplace</p>
          <h1>Rent Better, Earn Smarter, and Stay Protected</h1>
          <p>
            OmniShare is a trusted rental marketplace where customers discover verified products and hosts monetize idle inventory.
            This page demonstrates the actual customer-side interface and conversion flow used in the project.
          </p>
          <div className="demo-hero-actions">
            <Link to="/" className="demo-btn demo-btn-primary">Explore Listings</Link>
            <Link to="/demo/admin" className="demo-btn demo-btn-ghost">View Admin Strategy</Link>
          </div>
        </div>
        <div className="demo-security-card">
          <h3>Security Preview</h3>
          <p>Sample login interface with security controls.</p>
          <label>Email</label>
          <input type="email" placeholder="you@example.com" readOnly />
          <label>Password</label>
          <input type="password" value="********" readOnly />
          <div className="demo-security-row">
            <span>MFA Status</span>
            <strong>Enabled</strong>
          </div>
          <div className="demo-security-row">
            <span>Session Policy</span>
            <strong>15 min idle timeout</strong>
          </div>
          <button type="button" className="demo-btn demo-btn-primary" disabled>Secure Sign In</button>
        </div>
      </section>

      <section className="demo-section">
        <div className="demo-section-head">
          <h2>What Customers See</h2>
          <p>Curated inventory cards optimized for conversion and trust.</p>
        </div>
        <div className="demo-card-grid">
          {featuredItems.map((item) => (
            <article className="demo-card" key={item.title}>
              <p className="demo-tag">{item.tag}</p>
              <h3>{item.title}</h3>
              <p className="demo-muted">{item.category}</p>
              <div className="demo-card-foot">
                <strong>{item.price}</strong>
                <span>{item.rating} stars</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="demo-section demo-trust">
        <div className="demo-section-head">
          <h2>Why Users Trust OmniShare</h2>
          <p>Security and reliability controls communicated clearly in UI.</p>
        </div>
        <ul>
          {trustSignals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      </section>

      <section className="demo-section demo-facts">
        <div className="demo-section-head">
          <h2>Data-backed Product Positioning</h2>
          <p>Hardcoded estimates aligned with realistic market benchmarks.</p>
        </div>
        <div className="demo-metric-grid">
          <div>
            <p className="demo-metric-label">Estimated Repeat Booking Rate</p>
            <p className="demo-metric-value">34%</p>
            <p className="demo-muted">Targeting 30-40% repeat rate for managed rental cohorts.</p>
          </div>
          <div>
            <p className="demo-metric-label">Assisted Conversion Lift</p>
            <p className="demo-metric-value">+18%</p>
            <p className="demo-muted">From trust badges, insurance visibility, and fast checkout.</p>
          </div>
          <div>
            <p className="demo-metric-label">Complaint Resolution SLA</p>
            <p className="demo-metric-value">24 hrs</p>
            <p className="demo-muted">Issue triage workflow prioritizes payment and delivery blockers.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DemoCustomerPage;
