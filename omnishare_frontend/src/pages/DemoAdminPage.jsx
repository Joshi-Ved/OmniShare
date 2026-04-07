import React from 'react';
import './DemoShowcase.css';

const revenueRows = [
  { stream: 'Transaction Fee Model', value: 184250, split: 34, note: 'Commission on completed rentals' },
  { stream: 'Insurance Revenue Model', value: 97200, split: 18, note: '15% booking value share from insurance dealers' },
  { stream: 'Advertising Revenue Model', value: 42850, split: 8, note: 'Featured slots + top-banner placements' },
  { stream: 'Subscription Revenue Model', value: 29940, split: 6, note: 'Host premium plans and analytics pack' },
  { stream: 'Affiliate Revenue Model', value: 21500, split: 4, note: 'Partner referrals (logistics, accessories)' },
];

const marketingRows = [
  { channel: 'Performance Ads', spend: 'Rs 1,20,000', leads: 3200, cpa: 'Rs 375', conv: '5.8%' },
  { channel: 'Referral Program', spend: 'Rs 35,000', leads: 1450, cpa: 'Rs 241', conv: '8.9%' },
  { channel: 'Email Lifecycle', spend: 'Rs 12,000', leads: 980, cpa: 'Rs 122', conv: '11.6%' },
  { channel: 'Influencer Collabs', spend: 'Rs 70,000', leads: 1900, cpa: 'Rs 368', conv: '6.3%' },
  { channel: 'SEO + Content', spend: 'Rs 25,000', leads: 760, cpa: 'Rs 329', conv: '9.1%' },
];

const crmSignals = [
  { signal: 'Payment page slow', reports: 702, action: 'Prioritized checkout optimization sprint' },
  { signal: 'Late handover complaints', reports: 181, action: 'Introduced host SLA reminders + penalty policy' },
  { signal: 'KYC upload confusion', reports: 122, action: 'Stepwise upload guide + smart validation hints' },
  { signal: 'Insurance plan unclear', reports: 88, action: 'Plan comparison card added at checkout' },
];

const securityControls = [
  'Password hashing and tokenized auth sessions with expiry',
  'Input validation + throttling for auth and payment endpoints',
  'TLS in transit and encrypted sensitive fields at rest',
  'Role-based access controls for admin workflows and reports',
  'Audit logs for pricing changes, payout actions, and disputes',
  'SMTP credentials and keys kept in environment variables only',
];

const DemoAdminPage = () => {
  const totalRevenue = revenueRows.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="demo-shell demo-admin">
      <section className="demo-admin-hero">
        <div>
          <p className="demo-eyebrow">Admin Strategy Console</p>
          <h1>Business Model Demonstration Dashboard</h1>
          <p>
            This admin-side page demonstrates the assignment criteria end-to-end: revenue model, marketing strategy,
            CRM operations, and practical security implementation.
          </p>
        </div>
        <div className="demo-total">
          <p>Total Revenue (Hardcoded Demo)</p>
          <strong>Rs {totalRevenue.toLocaleString('en-IN')}</strong>
          <span>Monthly model projection</span>
        </div>
      </section>

      <section className="demo-section">
        <div className="demo-section-head">
          <h2>Revenue Model Mapping</h2>
          <p>Five major revenue models applied to OmniShare with estimated stream contribution.</p>
        </div>
        <div className="demo-table-wrap">
          <table className="demo-table">
            <thead>
              <tr>
                <th>Revenue Stream</th>
                <th>Estimated Monthly Value</th>
                <th>Share</th>
                <th>Operational Meaning</th>
              </tr>
            </thead>
            <tbody>
              {revenueRows.map((row) => (
                <tr key={row.stream}>
                  <td>{row.stream}</td>
                  <td>Rs {row.value.toLocaleString('en-IN')}</td>
                  <td>
                    <div className="demo-bar"><span style={{ width: `${row.split * 2}%` }} /></div>
                    <small>{row.split}%</small>
                  </td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="demo-section">
        <div className="demo-section-head">
          <h2>Marketing Strategy (5 Channels)</h2>
          <p>Acquisition strategy mix using paid, owned, and earned channels.</p>
        </div>
        <div className="demo-table-wrap">
          <table className="demo-table">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Budget</th>
                <th>Leads</th>
                <th>CPA</th>
                <th>Conversion</th>
              </tr>
            </thead>
            <tbody>
              {marketingRows.map((row) => (
                <tr key={row.channel}>
                  <td>{row.channel}</td>
                  <td>{row.spend}</td>
                  <td>{row.leads.toLocaleString('en-IN')}</td>
                  <td>{row.cpa}</td>
                  <td>{row.conv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="demo-section">
        <div className="demo-section-head">
          <h2>CRM Strategy and Automation</h2>
          <p>Selection -&gt; Acquisition -&gt; Retention -&gt; Upgradation with mailing and Omni Coins.</p>
        </div>
        <div className="demo-crm-grid">
          <article>
            <h3>Selection</h3>
            <ul>
              <li>RFM segmentation for high-intent customers and quality hosts.</li>
              <li>Trust score and KYC based lead qualification.</li>
            </ul>
          </article>
          <article>
            <h3>Acquisition</h3>
            <ul>
              <li>Mailing system: welcome series + abandoned inquiry reminders.</li>
              <li>Omni Coins signup/referral boosts to trigger first booking.</li>
            </ul>
          </article>
          <article>
            <h3>Retention</h3>
            <ul>
              <li>Feedback ingestion and complaint clustering automation.</li>
              <li>Repeat renter cashback slabs via Omni Coins loyalty tiers.</li>
            </ul>
          </article>
          <article>
            <h3>Upgradation</h3>
            <ul>
              <li>Host subscription upsell (analytics + premium visibility).</li>
              <li>Insurance plan nudges from basic to premium at checkout.</li>
            </ul>
          </article>
        </div>

        <div className="demo-table-wrap" style={{ marginTop: '1rem' }}>
          <table className="demo-table">
            <thead>
              <tr>
                <th>Customer Signal</th>
                <th>Reports</th>
                <th>Automated Action</th>
              </tr>
            </thead>
            <tbody>
              {crmSignals.map((signal) => (
                <tr key={signal.signal}>
                  <td>{signal.signal}</td>
                  <td>{signal.reports}</td>
                  <td>{signal.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="demo-section">
        <div className="demo-section-head">
          <h2>Security Implementation Showcase</h2>
          <p>Security explanation with a simple login mock and controls checklist.</p>
        </div>
        <div className="demo-security-grid">
          <div className="demo-security-card">
            <h3>Secure Admin Login Mock</h3>
            <label>Admin Email</label>
            <input type="email" value="admin@omnishare.com" readOnly />
            <label>Password</label>
            <input type="password" value="********" readOnly />
            <div className="demo-security-row"><span>MFA</span><strong>OTP + Backup codes</strong></div>
            <div className="demo-security-row"><span>Device Risk</span><strong>Adaptive challenge</strong></div>
            <button type="button" className="demo-btn demo-btn-primary" disabled>Authenticate</button>
          </div>
          <div className="demo-security-list">
            <h3>Controls in this business model</h3>
            <ul>
              {securityControls.map((control) => (
                <li key={control}>{control}</li>
              ))}
            </ul>
            <p className="demo-muted" style={{ marginTop: '0.75rem' }}>
              Mailing config is environment-driven (SMTP host/user/from). App password is server-side only and never exposed to frontend.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DemoAdminPage;
