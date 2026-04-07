import React from 'react';

const SCMPage = () => {
  return (
    <div className="page-shell" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '0.75rem' }}>Supply Chain Management (SCM)</h1>
      <p style={{ marginBottom: '1.25rem' }}>
        OmniShare SCM connects listing supply, handovers, disputes, and fulfillment reliability.
      </p>

      <section style={{ marginBottom: '1rem' }}>
        <h2>Operational focus</h2>
        <ul>
          <li>Inventory readiness and host reliability</li>
          <li>Demand-linked replenishment signals</li>
          <li>Dispute and logistics risk monitoring</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Where to view live dashboards</h2>
        <ul>
          <li>Backend SCM dashboard: /admin/scm-dashboard/</li>
          <li>Backend moderation GUI: /admin/moderation-gui/</li>
          <li>Frontend admin tab: /admin/dashboard</li>
        </ul>
      </section>
    </div>
  );
};

export default SCMPage;
