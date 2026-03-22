import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { toast } from 'react-toastify';
import './ERPDashboard.css';

const ERPDashboard = () => {
  const [activeModule, setActiveModule] = useState('overview');
  const [data, setData] = useState({ overview: null, inventory: null, crm: null, sales: null, scm: null });
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => { fetchERPData(); }, []);

  const fetchERPData = async () => {
    setLoading(true);
    try {
      const [overview, inventory, crm, sales, scm] = await Promise.all([
        adminAPI.getDashboard().catch(() => ({ data: {} })),
        adminAPI.getInventoryLinkage({}).catch(() => ({ data: {} })),
        adminAPI.getCustomers({}).catch(() => ({ data: { results: [] } })),
        adminAPI.getSalesReport({ group_by: 'week' }).catch(() => ({ data: {} })),
        adminAPI.getSCMDashboard({}).catch(() => ({ data: {} })),
      ]);
      setData({ overview: overview.data, inventory: inventory.data, crm: crm.data?.results || [], sales: sales.data, scm: scm.data });
    } catch { toast.error('Failed to load ERP data'); }
    finally { setLoading(false); }
  };

  const modules = [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'inventory', label: 'Inventory', icon: 'inventory_2' },
    { key: 'crm', label: 'CRM', icon: 'group' },
    { key: 'sales', label: 'Sales', icon: 'analytics' },
    { key: 'scm', label: 'Supply Chain', icon: 'local_shipping' },
  ];

  return (
    <div className="erp-root">
      {/* Header */}
      <header className="erp-header">
        <div className="erp-header-left">
          <div className="erp-header-icon">
            <span className="material-symbols-outlined">corporate_fare</span>
          </div>
          <div>
            <h1 className="erp-header-title">Enterprise Resource Planning</h1>
            <p className="erp-header-sub">Integrated ERP &amp; CRM Management System</p>
          </div>
        </div>
        <div className="erp-header-right">
          <select className="erp-select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
          <button className="erp-btn erp-btn-ghost" onClick={fetchERPData} disabled={loading}>
            <span className="material-symbols-outlined">{loading ? 'sync' : 'refresh'}</span>
            {loading ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Module Nav */}
      <nav className="erp-nav">
        {modules.map((m) => (
          <button key={m.key} className={`erp-nav-btn ${activeModule === m.key ? 'active' : ''}`} onClick={() => setActiveModule(m.key)}>
            <span className="material-symbols-outlined">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="erp-body">
        {activeModule === 'overview' && <OverviewModule data={data.overview} />}
        {activeModule === 'inventory' && <InventoryModule data={data.inventory} />}
        {activeModule === 'crm' && <CRMModule data={data.crm} />}
        {activeModule === 'sales' && <SalesModule data={data.sales} />}
        {activeModule === 'scm' && <SCMModule data={data.scm} />}
      </div>
    </div>
  );
};

/* ── Helpers ── */
const fmtINR = (n) => {
  const num = Number(n) || 0;
  if (num >= 10000000) return `₹${(num/10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num/100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num/1000).toFixed(1)}k`;
  return `₹${num.toFixed(0)}`;
};
const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

/* ── Shared primitives ── */
const ERPStatCard = ({ icon, label, value, trend, trendUp, accent, sub }) => (
  <div className={`erp-stat ${accent ? 'erp-stat--accent' : ''}`}>
    <div className="erp-stat-top">
      <span className={`erp-stat-icon ${accent ? 'erp-stat-icon--white' : ''}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      {trend && (
        <span className={`erp-stat-trend ${trendUp ? 'up' : 'down'}`}>
          <span className="material-symbols-outlined">{trendUp ? 'trending_up' : 'trending_down'}</span>
          {trend}
        </span>
      )}
    </div>
    <p className="erp-stat-label">{label}</p>
    <p className="erp-stat-value">{value}</p>
    {sub && <p className="erp-stat-sub">{sub}</p>}
  </div>
);

const ERPSectionTitle = ({ icon, title }) => (
  <h2 className="erp-section-title">
    <span className="material-symbols-outlined">{icon}</span>{title}
  </h2>
);

const ERPBadge = ({ status }) => {
  const map = { available: 'success', active: 'success', optimal: 'success', maintenance: 'warn', monitor: 'warn', inactive: 'danger', high: 'danger' };
  const cls = map[(status || '').toLowerCase()] || 'info';
  return <span className={`erp-badge erp-badge--${cls}`}>{status}</span>;
};

/* ── Overview ── */
const OverviewModule = ({ data }) => {
  if (!data) return <ERPLoader />;
  const kpis = [
    { icon: 'payments', label: 'Total Revenue', value: fmtINR(data.total_revenue), trend: '+12.5%', trendUp: true, sub: 'Platform commission' },
    { icon: 'list_alt', label: 'Active Listings', value: fmtNum(data.active_listings), trend: '+8 this month', trendUp: true },
    { icon: 'verified_user', label: 'Verified Users', value: fmtNum(data.verified_users), trend: '+15 this week', trendUp: true },
    { icon: 'pending_actions', label: 'Pending Approvals', value: data.pending_listings || 0, accent: true, sub: 'Requires action' },
    { icon: 'sync_alt', label: 'Active Bookings', value: fmtNum(data.active_bookings), trend: '+5 today', trendUp: true },
    { icon: 'account_balance_wallet', label: 'Platform Commission', value: fmtINR(data.total_commission), trend: '+5.2%', trendUp: true },
  ];

  const health = [
    { label: 'Data Integrity', pct: 98 },
    { label: 'Uptime', pct: 99.9 },
    { label: 'API Response', pct: 97, suffix: 'ms' },
    { label: 'User Satisfaction', pct: 94, suffix: '/5', display: '4.7' },
  ];

  return (
    <div className="erp-module">
      <div className="erp-stats-grid">
        {kpis.map((k, i) => <ERPStatCard key={i} {...k} />)}
      </div>

      <div className="erp-card">
        <ERPSectionTitle icon="monitor_heart" title="System Health" />
        <div className="erp-health-grid">
          {health.map((h) => (
            <div key={h.label} className="erp-health-item">
              <div className="erp-health-top">
                <span className="erp-health-label">{h.label}</span>
                <span className="erp-health-val">{h.display || h.pct}{h.suffix || '%'}</span>
              </div>
              <div className="erp-health-bar">
                <div className="erp-health-fill" style={{ width: `${Math.min(h.pct, 100)}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Inventory ── */
const InventoryModule = ({ data }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  if (!data) return <ERPLoader />;

  const items = (data.inventory_linkage || []).slice(0, 20).filter((item) => {
    const matchSearch = !search || String(item.listing_id).includes(search) || (item.category || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || (statusFilter === 'available' ? item.is_available : !item.is_available);
    return matchSearch && matchStatus;
  });

  return (
    <div className="erp-module">
      <div className="erp-module-toolbar">
        <ERPSectionTitle icon="inventory_2" title="Inventory Management" />
        <div className="erp-toolbar-right">
          <input className="erp-input" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="erp-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <button className="erp-btn erp-btn-primary">
            <span className="material-symbols-outlined">add</span> Add Item
          </button>
        </div>
      </div>

      <div className="erp-stats-grid erp-stats-grid--4">
        <ERPStatCard icon="inventory_2" label="Total Items" value={items.length} />
        <ERPStatCard icon="check_circle" label="Available" value={items.filter(i => i.is_available).length} />
        <ERPStatCard icon="percent" label="Utilization" value={`${Math.round((data.avg_utilization || 0) * 100)}%`} />
        <ERPStatCard icon="payments" label="Stock Value" value={`₹${(data.total_value || 0).toLocaleString()}`} accent />
      </div>

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr><th>SKU</th><th>Category</th><th>Utilization</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td><span className="erp-mono">SKU-{item.listing_id}</span></td>
                <td>{item.category || 'Electronics'}</td>
                <td>
                  <div className="erp-util-wrap">
                    <div className="erp-util-bar"><div className="erp-util-fill" style={{ width: `${item.utilization_percent || 0}%` }}></div></div>
                    <span className="erp-util-pct">{((item.utilization_percent || 0)).toFixed(0)}%</span>
                  </div>
                </td>
                <td><ERPBadge status={item.is_available ? 'Available' : 'Maintenance'} /></td>
                <td>
                  <div className="erp-row-actions">
                    <button className="erp-btn erp-btn-ghost erp-btn-sm"><span className="material-symbols-outlined">edit</span></button>
                    <button className="erp-btn erp-btn-danger erp-btn-sm"><span className="material-symbols-outlined">archive</span></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ── CRM ── */
const CRMModule = ({ data }) => {
  const [activeTab, setActiveTab] = useState('customers');
  const customers = Array.isArray(data) ? data : [];
  const segments = [
    { icon: 'star', label: 'Premium Customers', count: 234, desc: 'High-value customers with repeat purchases' },
    { icon: 'fiber_new', label: 'New Customers', count: 89, desc: 'First-time renters in last 30 days' },
    { icon: 'bedtime', label: 'Inactive Customers', count: 156, desc: 'No activity in last 90 days' },
    { icon: 'storefront', label: 'Engaged Hosts', count: 412, desc: 'Active hosts with listings' },
  ];

  return (
    <div className="erp-module">
      <div className="erp-module-toolbar">
        <ERPSectionTitle icon="group" title="Customer Relationship Management" />
        <button className="erp-btn erp-btn-primary"><span className="material-symbols-outlined">person_add</span> New Customer</button>
      </div>

      <div className="erp-crm-tabs">
        {[['customers', 'group', `Customers (${customers.length})`], ['segments', 'pie_chart', 'Segments'], ['interactions', 'forum', 'Interactions']].map(([k, icon, label]) => (
          <button key={k} className={`erp-crm-tab ${activeTab === k ? 'active' : ''}`} onClick={() => setActiveTab(k)}>
            <span className="material-symbols-outlined">{icon}</span>{label}
          </button>
        ))}
      </div>

      {activeTab === 'customers' && (
        <div className="erp-customers-grid">
          {customers.slice(0, 12).map((c, i) => (
            <div key={i} className="erp-customer-card">
              <div className="erp-customer-avatar">{c.full_name?.[0]?.toUpperCase() || 'U'}</div>
              <div className="erp-customer-info">
                <h4 className="erp-customer-name">{c.full_name || 'Customer'}</h4>
                <p className="erp-customer-email">{c.email}</p>
                <div className="erp-customer-meta">
                  <span>5 orders</span><span>₹450 value</span>
                </div>
                <span className={`erp-badge ${c.gold_host_flag ? 'erp-badge--accent' : 'erp-badge--info'}`}>
                  {c.gold_host_flag ? 'Gold Host' : 'Regular'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'segments' && (
        <div className="erp-segments-grid">
          {segments.map((s, i) => (
            <div key={i} className="erp-segment-card">
              <div className="erp-segment-icon"><span className="material-symbols-outlined">{s.icon}</span></div>
              <h4 className="erp-segment-name">{s.label}</h4>
              <p className="erp-segment-count">{s.count}</p>
              <p className="erp-segment-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'interactions' && (
        <div className="erp-empty"><span className="material-symbols-outlined">forum</span><p>Interaction history coming soon</p></div>
      )}
    </div>
  );
};

/* ── Sales ── */
const SalesModule = ({ data }) => {
  const metrics = [
    { icon: 'payments', label: 'Total Revenue', value: fmtINR(125450), trend: '+12.5%', trendUp: true },
    { icon: 'shopping_cart', label: 'Avg Order Value', value: fmtINR(285), trend: '+2.3%', trendUp: true },
    { icon: 'receipt_long', label: 'Total Orders', value: '439', trend: '+8.7%', trendUp: true },
    { icon: 'percent', label: 'Conversion Rate', value: '3.8%', trend: '+0.5%', trendUp: true, accent: true },
  ];
  const categories = [
    { name: 'Electronics', pct: 45, value: '₹56,453' },
    { name: 'Sports & Outdoor', pct: 28, value: '₹35,126' },
    { name: 'Lifestyle', pct: 18, value: '₹22,671' },
    { name: 'Others', pct: 9, value: '₹11,200' },
  ];

  return (
    <div className="erp-module">
      <ERPSectionTitle icon="analytics" title="Sales Analytics & Revenue" />
      <div className="erp-stats-grid">
        {metrics.map((m, i) => <ERPStatCard key={i} {...m} />)}
      </div>
      <div className="erp-card">
        <ERPSectionTitle icon="bar_chart" title="Revenue by Category" />
        <div className="erp-category-list">
          {categories.map((c, i) => (
            <div key={i} className="erp-category-row">
              <span className="erp-category-name">{c.name}</span>
              <div className="erp-category-bar-wrap">
                <div className="erp-category-bar"><div className="erp-category-fill" style={{ width: `${c.pct}%` }}></div></div>
                <span className="erp-category-pct">{c.pct}%</span>
              </div>
              <span className="erp-category-val">{c.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── SCM ── */
const SCMModule = ({ data }) => {
  const stages = [
    { icon: 'upload', label: 'Listings Posted', value: 156, sub: 'This week' },
    { icon: 'verified', label: 'Verified Items', value: 148, sub: '95% approval' },
    { icon: 'inventory_2', label: 'Available Stock', value: '1,247', sub: 'Ready to rent' },
    { icon: 'local_shipping', label: 'In Transit', value: 34, sub: 'Delivery pending' },
  ];
  const routes = [
    { name: 'Downtown Hub', items: 45, pickups: 12, rate: '98.5%', status: 'Optimal' },
    { name: 'North District', items: 32, pickups: 8, rate: '96.2%', status: 'Optimal' },
    { name: 'South Zone', items: 28, pickups: 5, rate: '94.1%', status: 'Monitor' },
  ];

  return (
    <div className="erp-module">
      <ERPSectionTitle icon="local_shipping" title="Supply Chain Management" />
      <div className="erp-pipeline">
        {stages.map((s, i) => (
          <React.Fragment key={i}>
            <div className="erp-pipeline-stage">
              <div className="erp-pipeline-icon"><span className="material-symbols-outlined">{s.icon}</span></div>
              <h4 className="erp-pipeline-label">{s.label}</h4>
              <p className="erp-pipeline-value">{s.value}</p>
              <p className="erp-pipeline-sub">{s.sub}</p>
            </div>
            {i < stages.length - 1 && <div className="erp-pipeline-arrow"><span className="material-symbols-outlined">arrow_forward</span></div>}
          </React.Fragment>
        ))}
      </div>
      <div className="erp-card">
        <ERPSectionTitle icon="route" title="Logistics Overview" />
        <div className="erp-table-wrap">
          <table className="erp-table">
            <thead><tr><th>Route</th><th>Items</th><th>Pickup Requests</th><th>Delivery Rate</th><th>Status</th></tr></thead>
            <tbody>
              {routes.map((r, i) => (
                <tr key={i}>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.items}</td>
                  <td>{r.pickups}</td>
                  <td><strong>{r.rate}</strong></td>
                  <td><ERPBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ERPLoader = () => (
  <div className="erp-loader">
    <div className="erp-loader-spinner"></div>
    <p>Loading data...</p>
  </div>
);

export default ERPDashboard;
