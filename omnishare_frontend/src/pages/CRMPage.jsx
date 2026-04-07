import React from 'react';

const CRMPage = () => {
  return (
    <div className="page-shell" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '0.75rem' }}>Customer Relationship Management (CRM)</h1>
      <p style={{ marginBottom: '1.25rem' }}>
        OmniShare CRM focuses on lifecycle growth across acquisition, conversion, retention, and support.
      </p>

      <section style={{ marginBottom: '1rem' }}>
        <h2>What is tracked</h2>
        <ul>
          <li>User verification and trust score</li>
          <li>Booking and cancellation behavior</li>
          <li>Revenue, repeat usage, and retention cohorts</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Where to view live dashboards</h2>
        <ul>
          <li>Backend admin CRM dashboard: /admin/crm-dashboard/</li>
          <li>Backend customers GUI: /admin/customers-gui/</li>
          <li>Frontend admin tab: /admin/dashboard</li>
        </ul>
      </section>
    </div>
  );
};

export default CRMPage;
