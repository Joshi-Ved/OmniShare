import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { toast } from 'react-toastify';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [pendingListings, setPendingListings] = useState([]);
  const [pendingKYC, setPendingKYC] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState(null);
  const [basicInventory, setBasicInventory] = useState([]);
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('all');
  const [scm, setScm] = useState(null);
  const [decisionSupport, setDecisionSupport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, listingsRes, kycRes, disputesRes, ordersRes, customersRes, salesRes, inventoryRes, scmRes, decisionRes] = await Promise.all([
        adminAPI.getDashboard().catch(() => ({ data: {} })),
        adminAPI.getPendingListings().catch(() => ({ data: { results: [] } })),
        adminAPI.getPendingKYC().catch(() => ({ data: { results: [] } })),
        adminAPI.getDisputedBookings().catch(() => ({ data: { results: [] } })),
        adminAPI.getOrders({}).catch(() => ({ data: [] })),
        adminAPI.getCustomers({}).catch(() => ({ data: { results: [] } })),
        adminAPI.getSalesReport({ group_by: 'week' }).catch(() => ({ data: null })),
        adminAPI.getInventoryLinkage({}).catch(() => ({ data: null })),
        adminAPI.getSCMDashboard({}).catch(() => ({ data: null })),
        adminAPI.getDecisionSupport().catch(() => ({ data: null })),
      ]);
      setStats(statsRes.data || {});
      setPendingListings(listingsRes.data.results || listingsRes.data || []);
      setPendingKYC(kycRes.data.results || kycRes.data || []);
      setDisputes(disputesRes.data.results || disputesRes.data || []);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.results || []);
      setCustomers(customersRes.data.results || []);
      setSales(salesRes.data);
      const inventoryRows = (inventoryRes.data?.inventory_linkage || []).slice(0, 80).map((item) => ({
        ...item, sku: `SKU-${item.listing_id}`,
        stock: Math.max(1, Math.round((item.utilization_percent ?? 0) / 10) || 1),
        status: item.is_available ? 'available' : 'maintenance',
      }));
      setBasicInventory(inventoryRows);
      setScm(scmRes.data);
      setDecisionSupport(decisionRes.data);
    } catch { toast.error('Failed to load admin dashboard data'); }
    finally { setLoading(false); }
  };

  const handleVerifyListing = async (listingId, status) => {
    try {
      await adminAPI.verifyListing({ listing_id: listingId, status, remarks: status === 'approved' ? 'Verified' : 'Does not meet requirements' });
      toast.success(`Listing ${status}`); fetchDashboardData();
    } catch { toast.error('Failed to verify listing'); }
  };

  const handleVerifyKYC = async (userId, status) => {
    try {
      await adminAPI.verifyKYC({ user_id: userId, status, remarks: '' });
      toast.success(`KYC ${status}`); fetchDashboardData();
    } catch { toast.error('Failed to verify KYC'); }
  };

  const handleResolveDispute = async (bookingId, refundToGuest) => {
    const resolution = prompt('Enter resolution details:');
    if (!resolution) return;
    try {
      await adminAPI.resolveDispute({ booking_id: bookingId, resolution, refund_to_guest: refundToGuest });
      toast.success('Dispute resolved'); fetchDashboardData();
    } catch { toast.error('Failed to resolve dispute'); }
  };

  const handleApplyOrderFilters = async () => {
    try {
      const response = await adminAPI.getOrders({ status: orderStatusFilter || undefined, search: orderSearch || undefined });
      setOrders(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch { toast.error('Failed to filter orders'); }
  };

  const updateInventoryItem = (listingId, updates) => {
    setBasicInventory((prev) => prev.map((item) => (item.listing_id === listingId ? { ...item, ...updates } : item)));
  };

  const filteredInventory = basicInventory.filter((item) => {
    const text = `${item.title || ''} ${item.host || ''} ${item.sku || ''}`.toLowerCase();
    return text.includes(inventoryQuery.toLowerCase()) && (inventoryStatusFilter === 'all' || item.status === inventoryStatusFilter);
  });

  const tabs = [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'listings', label: `Listings (${pendingListings.length})`, icon: 'list_alt' },
    { key: 'kyc', label: `KYC (${pendingKYC.length})`, icon: 'verified_user' },
    { key: 'disputes', label: `Disputes (${disputes.length})`, icon: 'gavel' },
    { key: 'orders', label: `Orders (${orders.length})`, icon: 'receipt_long' },
    { key: 'basic_inventory', label: `Inventory (${basicInventory.length})`, icon: 'inventory_2' },
    { key: 'customers', label: 'Customers', icon: 'group' },
    { key: 'sales', label: 'Sales', icon: 'analytics' },
    { key: 'scm', label: 'SCM', icon: 'local_shipping' },
    { key: 'decisions', label: 'Decisions', icon: 'insights' },
  ];

  if (loading) return (
    <div className="adm-loading">
      <div className="adm-loading-spinner"></div>
      <p>Loading dashboard...</p>
    </div>
  );

  return (
    <div className="adm-root">
      {/* Sidebar */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-brand">
          <span className="material-symbols-outlined">hub</span>
          <span>OmniShare</span>
        </div>
        <nav className="adm-sidebar-nav">
          {tabs.map((t) => (
            <button key={t.key} className={`adm-nav-item ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              <span className="material-symbols-outlined">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-footer">
          <div className="adm-sidebar-user">
            <div className="adm-user-avatar">A</div>
            <div>
              <p className="adm-user-name">Admin Central</p>
              <p className="adm-user-role">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="adm-main">
        {/* Top bar */}
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <h1 className="adm-topbar-title">{tabs.find(t => t.key === activeTab)?.label || 'Dashboard'}</h1>
          </div>
          <div className="adm-topbar-right">
            <Link to="/admin/erp" className="adm-btn adm-btn-ghost">
              <span className="material-symbols-outlined">open_in_new</span> ERP Workspace
            </Link>
            <button onClick={fetchDashboardData} className="adm-btn adm-btn-primary">
              <span className="material-symbols-outlined">refresh</span> Refresh
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="adm-content">
          {activeTab === 'overview' && <OverviewTab stats={stats} pendingListings={pendingListings} pendingKYC={pendingKYC} disputes={disputes} />}
          {activeTab === 'listings' && <ListingsTab listings={pendingListings} onVerify={handleVerifyListing} />}
          {activeTab === 'kyc' && <KYCTab users={pendingKYC} onVerify={handleVerifyKYC} />}
          {activeTab === 'disputes' && <DisputesTab disputes={disputes} onResolve={handleResolveDispute} />}
          {activeTab === 'orders' && <OrdersTab orders={orders} orderSearch={orderSearch} setOrderSearch={setOrderSearch} orderStatusFilter={orderStatusFilter} setOrderStatusFilter={setOrderStatusFilter} onApplyFilters={handleApplyOrderFilters} onResolve={handleResolveDispute} />}
          {activeTab === 'basic_inventory' && <BasicInventoryTab inventory={filteredInventory} inventoryQuery={inventoryQuery} setInventoryQuery={setInventoryQuery} inventoryStatusFilter={inventoryStatusFilter} setInventoryStatusFilter={setInventoryStatusFilter} onUpdate={updateInventoryItem} />}
          {activeTab === 'customers' && <CustomersTab customers={customers} />}
          {activeTab === 'sales' && <SalesTab sales={sales} />}
          {activeTab === 'scm' && <SCMTab scm={scm} />}
          {activeTab === 'decisions' && <DecisionsTab data={decisionSupport} />}
        </main>
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

/* ── Sub-components ── */

const StatCard = ({ icon, label, value, trend, trendUp, accent, sub }) => (
  <div className={`adm-stat-card ${accent ? 'adm-stat-card--accent' : ''}`}>
    <div className="adm-stat-card-top">
      <span className={`adm-stat-icon ${accent ? 'adm-stat-icon--white' : ''}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      {trend && (
        <span className={`adm-stat-trend ${trendUp ? 'up' : 'down'}`}>
          <span className="material-symbols-outlined">{trendUp ? 'trending_up' : 'trending_down'}</span>
          {trend}
        </span>
      )}
    </div>
    <p className="adm-stat-label">{label}</p>
    <p className="adm-stat-value">{value}</p>
    {sub && <p className="adm-stat-sub">{sub}</p>}
  </div>
);

const MiniBar = ({ value, max, color }) => (
  <div className="adm-mini-bar-wrap">
    <div className="adm-mini-bar-track">
      <div className="adm-mini-bar-fill" style={{ width: `${Math.min(100, max > 0 ? (value/max)*100 : 0)}%`, background: color || 'linear-gradient(90deg,var(--adm-primary),var(--adm-primary-mid))' }} />
    </div>
  </div>
);

const SectionHeader = ({ icon, title, action }) => (
  <div className="adm-section-header">
    <h2 className="adm-section-title">
      <span className="material-symbols-outlined">{icon}</span>{title}
    </h2>
    {action}
  </div>
);

const Badge = ({ status }) => {
  const map = {
    completed: 'adm-badge--success', approved: 'adm-badge--success', verified: 'adm-badge--success', available: 'adm-badge--success',
    pending: 'adm-badge--warning', maintenance: 'adm-badge--warning', in_use: 'adm-badge--info', confirmed: 'adm-badge--info',
    disputed: 'adm-badge--danger', rejected: 'adm-badge--danger', cancelled: 'adm-badge--danger',
  };
  return <span className={`adm-badge ${map[status] || 'adm-badge--info'}`}>{status}</span>;
};

const OverviewTab = ({ stats, pendingListings, pendingKYC, disputes }) => {
  const cats = (stats?.category_performance || []).slice(0, 6);
  const maxCatBookings = Math.max(...cats.map(c => c.total_bookings || 0), 1);
  const topHosts = (stats?.top_hosts || []).slice(0, 5);
  const maxEarnings = Math.max(...topHosts.map(h => h.total_earnings || 0), 1);

  return (
    <div className="adm-tab-content">
      <div className="adm-stats-grid">
        <StatCard icon="group" label="Total Users" value={fmtNum(stats?.users?.total)} sub={`${stats?.users?.verified || 0} verified`} trend="+12%" trendUp />
        <StatCard icon="list_alt" label="Active Listings" value={fmtNum(stats?.listings?.active)} sub={`${stats?.listings?.total || 0} total`} trend="+8%" trendUp />
        <StatCard icon="receipt_long" label="Total Bookings" value={fmtNum(stats?.bookings?.total)} sub={`${stats?.bookings?.completed || 0} completed`} trend="+5%" trendUp />
        <StatCard icon="payments" label="Platform Revenue" value={fmtINR(stats?.revenue?.total_platform_revenue)} sub={`${fmtINR(stats?.revenue?.monthly_gmv)} GMV this month`} accent />
      </div>

      <div className="adm-overview-grid">
        <div className="adm-card">
          <SectionHeader icon="manage_accounts" title="User Breakdown" />
          <div className="adm-kv-list">
            <div className="adm-kv-row"><span>Verified Users</span><strong>{fmtNum(stats?.users?.verified)}</strong></div>
            <div className="adm-kv-row"><span>Gold Hosts</span><strong className="adm-text-primary">{stats?.users?.gold_hosts || 0}</strong></div>
            <div className="adm-kv-row"><span>Pending KYC</span><strong className="adm-text-warn">{pendingKYC.length}</strong></div>
          </div>
        </div>
        <div className="adm-card">
          <SectionHeader icon="sync_alt" title="Booking Status" />
          <div className="adm-kv-list">
            <div className="adm-kv-row"><span>Completed</span><strong>{fmtNum(stats?.bookings?.completed)}</strong></div>
            <div className="adm-kv-row"><span>Active</span><strong className="adm-text-primary">{fmtNum(stats?.bookings?.active)}</strong></div>
            <div className="adm-kv-row"><span>Disputed</span><strong className="adm-text-danger">{stats?.bookings?.disputed || 0}</strong></div>
          </div>
        </div>
        <div className="adm-card">
          <SectionHeader icon="pending_actions" title="Action Required" />
          <div className="adm-kv-list">
            <div className="adm-kv-row"><span>Pending Listings</span><strong className="adm-text-warn">{pendingListings.length}</strong></div>
            <div className="adm-kv-row"><span>Pending KYC</span><strong className="adm-text-warn">{pendingKYC.length}</strong></div>
            <div className="adm-kv-row"><span>Open Disputes</span><strong className="adm-text-danger">{disputes.length}</strong></div>
          </div>
        </div>
      </div>

      {cats.length > 0 && (
        <div className="adm-overview-grid adm-overview-grid--2" style={{ marginTop: '16px' }}>
          <div className="adm-card">
            <SectionHeader icon="bar_chart" title="Category Performance" />
            <div className="adm-cat-list">
              {cats.map((c, i) => (
                <div key={i} className="adm-cat-row">
                  <span className="adm-cat-name">{c.category__name || 'Other'}</span>
                  <MiniBar value={c.total_bookings || 0} max={maxCatBookings} />
                  <span className="adm-cat-val">{c.total_bookings || 0}</span>
                </div>
              ))}
            </div>
          </div>
          {topHosts.length > 0 && (
            <div className="adm-card">
              <SectionHeader icon="emoji_events" title="Top Hosts" />
              <div className="adm-cat-list">
                {topHosts.map((h, i) => (
                  <div key={i} className="adm-cat-row">
                    <div className="adm-user-cell" style={{ minWidth: 0 }}>
                      <div className="adm-avatar-sm">{h.username?.[0]?.toUpperCase()}</div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.username}</span>
                    </div>
                    <MiniBar value={h.total_earnings || 0} max={maxEarnings} />
                    <span className="adm-cat-val" style={{ color: '#059669' }}>{fmtINR(h.total_earnings)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ListingsTab = ({ listings, onVerify }) => (
  <div className="adm-tab-content">
    <SectionHeader icon="list_alt" title="Pending Listings" />
    {listings.length === 0 ? <EmptyState icon="check_circle" message="No pending listings" /> : (
      <div className="adm-cards-grid">
        {listings.map((l) => (
          <div key={l.id} className="adm-card adm-item-card">
            <div className="adm-item-card-body">
              <h3 className="adm-item-title">{l.title}</h3>
              <p className="adm-item-desc">{l.description?.substring(0, 120)}...</p>
              <p className="adm-item-meta"><span className="material-symbols-outlined">payments</span> ₹{l.daily_price}/day</p>
            </div>
            <div className="adm-item-actions">
              <button className="adm-btn adm-btn-success" onClick={() => onVerify(l.id, 'approved')}>
                <span className="material-symbols-outlined">check</span> Approve
              </button>
              <button className="adm-btn adm-btn-danger" onClick={() => onVerify(l.id, 'rejected')}>
                <span className="material-symbols-outlined">close</span> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const KYCTab = ({ users, onVerify }) => (
  <div className="adm-tab-content">
    <SectionHeader icon="verified_user" title="Pending KYC Verifications" />
    {users.length === 0 ? <EmptyState icon="check_circle" message="No pending KYC requests" /> : (
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><div className="adm-user-cell"><div className="adm-avatar-sm">{u.username?.[0]?.toUpperCase()}</div>{u.username}</div></td>
                <td className="adm-text-muted">{u.email}</td>
                <td><Badge status={u.role} /></td>
                <td>
                  <div className="adm-row-actions">
                    <button className="adm-btn adm-btn-success adm-btn-sm" onClick={() => onVerify(u.id, 'verified')}>Verify</button>
                    <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => onVerify(u.id, 'rejected')}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const DisputesTab = ({ disputes, onResolve }) => (
  <div className="adm-tab-content">
    <SectionHeader icon="gavel" title="Active Disputes" />
    {disputes.length === 0 ? <EmptyState icon="check_circle" message="No active disputes" /> : (
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th>Booking</th><th>Guest</th><th>Host</th><th>Reason</th><th>Actions</th></tr></thead>
          <tbody>
            {disputes.map((d) => (
              <tr key={d.id}>
                <td><span className="adm-mono">#{d.id}</span><br /><span className="adm-text-muted adm-text-sm">{d.listing_title}</span></td>
                <td>{d.guest_name}</td>
                <td>{d.host_name}</td>
                <td className="adm-text-muted">{d.dispute_reason}</td>
                <td>
                  <div className="adm-row-actions">
                    <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => onResolve(d.id, false)}>Favor Host</button>
                    <button className="adm-btn adm-btn-warn adm-btn-sm" onClick={() => onResolve(d.id, true)}>Refund Guest</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const OrdersTab = ({ orders, orderSearch, setOrderSearch, orderStatusFilter, setOrderStatusFilter, onApplyFilters, onResolve }) => (
  <div className="adm-tab-content">
    <SectionHeader icon="receipt_long" title="Order Management" />
    <div className="adm-toolbar">
      <input className="adm-input" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Search by order, listing, guest or host..." />
      <select className="adm-select" value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)}>
        <option value="">All Statuses</option>
        {['pending','confirmed','in_use','completed','cancelled','disputed'].map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <button className="adm-btn adm-btn-primary" onClick={onApplyFilters}>
        <span className="material-symbols-outlined">filter_list</span> Apply
      </button>
    </div>
    <div className="adm-mini-stats">
      <div className="adm-mini-stat"><span>Total</span><strong>{orders.length}</strong></div>
      <div className="adm-mini-stat"><span>Completed</span><strong>{orders.filter(o => o.booking_status === 'completed').length}</strong></div>
      <div className="adm-mini-stat adm-mini-stat--danger"><span>Disputed</span><strong>{orders.filter(o => o.dispute_flag).length}</strong></div>
    </div>
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr><th>Order</th><th>Listing</th><th>Guest</th><th>Host</th><th>Status</th><th>Total</th><th>Action</th></tr></thead>
        <tbody>
          {orders.slice(0, 80).map((o) => (
            <tr key={o.id}>
              <td><span className="adm-mono">#{o.id}</span></td>
              <td>{o.listing_title || '—'}</td>
              <td>{o.guest_name || '—'}</td>
              <td>{o.host_name || '—'}</td>
              <td><Badge status={o.booking_status} /></td>
              <td><strong>₹{Number(o.guest_total || 0).toFixed(2)}</strong></td>
              <td>
                {o.booking_status === 'disputed'
                  ? <button className="adm-btn adm-btn-warn adm-btn-sm" onClick={() => onResolve(o.id, false)}>Resolve</button>
                  : <span className="adm-text-muted adm-text-sm">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const BasicInventoryTab = ({ inventory, inventoryQuery, setInventoryQuery, inventoryStatusFilter, setInventoryStatusFilter, onUpdate }) => (
  <div className="adm-tab-content">
    <SectionHeader icon="inventory_2" title="Inventory Management" />
    <div className="adm-toolbar">
      <input className="adm-input" value={inventoryQuery} onChange={(e) => setInventoryQuery(e.target.value)} placeholder="Search by listing, host or SKU..." />
      <select className="adm-select" value={inventoryStatusFilter} onChange={(e) => setInventoryStatusFilter(e.target.value)}>
        <option value="all">All Statuses</option>
        <option value="available">Available</option>
        <option value="rented">Rented</option>
        <option value="maintenance">Maintenance</option>
      </select>
    </div>
    <div className="adm-mini-stats">
      <div className="adm-mini-stat"><span>Total Items</span><strong>{inventory.length}</strong></div>
      <div className="adm-mini-stat adm-mini-stat--success"><span>Available</span><strong>{inventory.filter(i => i.status === 'available').length}</strong></div>
      <div className="adm-mini-stat adm-mini-stat--warn"><span>Maintenance</span><strong>{inventory.filter(i => i.status === 'maintenance').length}</strong></div>
    </div>
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr><th>SKU</th><th>Item</th><th>Host</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {inventory.slice(0, 120).map((item) => (
            <tr key={item.listing_id}>
              <td><span className="adm-mono">{item.sku}</span></td>
              <td>{item.title}</td>
              <td className="adm-text-muted">{item.host}</td>
              <td>
                <div className="adm-stepper">
                  <button className="adm-stepper-btn" onClick={() => onUpdate(item.listing_id, { stock: Math.max(0, (item.stock || 0) - 1) })}>−</button>
                  <span>{item.stock}</span>
                  <button className="adm-stepper-btn" onClick={() => onUpdate(item.listing_id, { stock: (item.stock || 0) + 1 })}>+</button>
                </div>
              </td>
              <td><Badge status={item.status} /></td>
              <td>
                <div className="adm-row-actions">
                  <button className="adm-btn adm-btn-success adm-btn-sm" onClick={() => onUpdate(item.listing_id, { status: 'available' })}>Available</button>
                  <button className="adm-btn adm-btn-warn adm-btn-sm" onClick={() => onUpdate(item.listing_id, { status: 'maintenance' })}>Maintenance</button>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => onUpdate(item.listing_id, { status: 'rented' })}>Rented</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const CustomersTab = ({ customers }) => (
  <div className="adm-tab-content">
    <SectionHeader icon="group" title="Customer Management" />
    <div className="adm-mini-stats">
      <div className="adm-mini-stat"><span>Total</span><strong>{customers.length}</strong></div>
      <div className="adm-mini-stat adm-mini-stat--success"><span>Verified</span><strong>{customers.filter(c => c.kyc_status === 'verified').length}</strong></div>
      <div className="adm-mini-stat adm-mini-stat--warn"><span>Pending KYC</span><strong>{customers.filter(c => c.kyc_status === 'pending').length}</strong></div>
    </div>
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr><th>Customer</th><th>Role</th><th>KYC</th><th>Trust Score</th><th>Guest Spend</th><th>Host Revenue</th><th>Bookings</th></tr></thead>
        <tbody>
          {customers.slice(0, 50).map((c) => (
            <tr key={c.id}>
              <td>
                <div className="adm-user-cell">
                  <div className="adm-avatar-sm">{c.username?.[0]?.toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.username}</div>
                    <div className="adm-text-muted adm-text-sm">{c.email}</div>
                  </div>
                </div>
              </td>
              <td><Badge status={c.role} /></td>
              <td><Badge status={c.kyc_status} /></td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '4px', background: 'var(--adm-surface-high)', borderRadius: '999px', overflow: 'hidden', minWidth: '50px' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (Number(c.trust_score) / 5) * 100)}%`, background: 'linear-gradient(90deg,var(--adm-primary),var(--adm-primary-mid))', borderRadius: '999px' }} />
                  </div>
                  <span className="adm-trust-score">{Number(c.trust_score || 0).toFixed(1)}</span>
                </div>
              </td>
              <td><strong>{fmtINR(c.guest_spend)}</strong></td>
              <td><strong>{fmtINR(c.host_revenue)}</strong></td>
              <td className="adm-text-muted">{(c.total_guest_bookings || 0) + (c.total_host_bookings || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const SalesTab = ({ sales }) => {
  if (!sales) return <EmptyState icon="analytics" message="No sales data available" />;
  const timeline = sales?.timeline || [];
  const maxGmv = Math.max(...timeline.map(b => b.gmv || 0), 1);
  return (
    <div className="adm-tab-content">
      <SectionHeader icon="analytics" title="Sales Report" />
      <div className="adm-stats-grid">
        <StatCard icon="shopping_cart" label="Bookings Created" value={fmtNum(sales?.totals?.bookings_created)} sub="In period" />
        <StatCard icon="check_circle" label="Completed" value={fmtNum(sales?.totals?.bookings_completed)} sub={`${sales?.totals?.completion_rate || 0}% rate`} />
        <StatCard icon="payments" label="GMV" value={fmtINR(sales?.totals?.gmv)} sub={`Avg ${fmtINR(sales?.totals?.average_order_value)}/order`} accent />
        <StatCard icon="account_balance_wallet" label="Commission" value={fmtINR(sales?.totals?.platform_commission)} sub="Platform earnings" />
      </div>

      {timeline.length > 0 && (
        <div className="adm-card" style={{ marginTop: '20px' }}>
          <SectionHeader icon="bar_chart" title="GMV Timeline" />
          <div className="adm-timeline-chart">
            {timeline.slice(0, 8).map((b, i) => (
              <div key={i} className="adm-timeline-col">
                <div className="adm-timeline-bar-wrap">
                  <div className="adm-timeline-bar" style={{ height: `${Math.max(4, Math.round((b.gmv / maxGmv) * 80))}px` }} title={`GMV: ${fmtINR(b.gmv)}`} />
                </div>
                <span className="adm-timeline-label">{b.label?.split(' to ')[0]?.slice(5)}</span>
              </div>
            ))}
          </div>
          <div className="adm-table-wrap" style={{ marginTop: '16px' }}>
            <table className="adm-table">
              <thead><tr><th>Period</th><th>Created</th><th>Completed</th><th>Cancelled</th><th>GMV</th><th>Commission</th></tr></thead>
              <tbody>
                {timeline.slice(0, 8).map((b, i) => (
                  <tr key={i}>
                    <td><strong style={{ fontSize: '0.8rem' }}>{b.label}</strong></td>
                    <td>{b.created}</td>
                    <td><span className="adm-text-primary" style={{ fontWeight: 600 }}>{b.completed}</span></td>
                    <td><span className="adm-text-danger">{b.cancelled}</span></td>
                    <td><strong>{fmtINR(b.gmv)}</strong></td>
                    <td>{fmtINR(b.platform_commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const SCMTab = ({ scm }) => {
  if (!scm) return <EmptyState icon="local_shipping" message="No SCM data available" />;
  const suppliers = (scm?.supplier_performance || []).slice(0, 10);
  const maxGmv = Math.max(...suppliers.map(s => s.gmv || 0), 1);
  return (
    <div className="adm-tab-content">
      <SectionHeader icon="local_shipping" title="SCM Control Tower" />
      <div className="adm-stats-grid">
        <StatCard icon="inventory_2" label="Inventory Nodes" value={fmtNum(scm?.scm_summary?.total_inventory_nodes)} sub="Total listings" />
        <StatCard icon="check_circle" label="Available Nodes" value={fmtNum(scm?.scm_summary?.available_inventory_nodes)} sub="Ready to rent" />
        <StatCard icon="receipt_long" label="Window Orders" value={fmtNum(scm?.scm_summary?.window_completed_orders)} sub="Completed in period" />
        <StatCard icon="payments" label="Window GMV" value={fmtINR(scm?.scm_summary?.window_gmv)} sub="Period revenue" accent />
      </div>

      <div className="adm-overview-grid adm-overview-grid--2" style={{ marginTop: '16px' }}>
        {(scm?.procurement_signals || []).length > 0 && (
          <div className="adm-card">
            <SectionHeader icon="campaign" title="Procurement Signals" />
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>Item</th><th>Signal</th><th>Demand</th></tr></thead>
                <tbody>
                  {scm.procurement_signals.slice(0, 8).map((s) => (
                    <tr key={s.listing_id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{s.title}</div>
                        <div className="adm-text-muted adm-text-sm">{s.category}</div>
                      </td>
                      <td><Badge status={s.signal === 'restock_priority' ? 'confirmed' : 'disputed'} /></td>
                      <td><strong>{s.demand_score}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {suppliers.length > 0 && (
          <div className="adm-card">
            <SectionHeader icon="storefront" title="Supplier Performance" />
            <div className="adm-cat-list">
              {suppliers.map((s, i) => (
                <div key={i} className="adm-cat-row">
                  <div className="adm-user-cell" style={{ minWidth: 0 }}>
                    <div className="adm-avatar-sm">{s.username?.[0]?.toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.username}</div>
                      <div className="adm-text-sm" style={{ color: s.risk_band === 'high' ? 'var(--adm-danger)' : 'var(--adm-success)' }}>{s.fill_rate_percent}% fill rate</div>
                    </div>
                  </div>
                  <MiniBar value={s.gmv || 0} max={maxGmv} color={s.risk_band === 'high' ? 'linear-gradient(90deg,#ba1a1a,#ef4444)' : undefined} />
                  <span className="adm-cat-val">{fmtINR(s.gmv)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="adm-card" style={{ marginTop: '16px' }}>
        <SectionHeader icon="route" title="Logistics KPIs" />
        <div className="adm-kv-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0' }}>
          <div className="adm-kv-row"><span>Handover Completed</span><strong className="adm-text-primary">{fmtNum(scm?.logistics_kpis?.handover_completed)}</strong></div>
          <div className="adm-kv-row"><span>Returns Completed</span><strong className="adm-text-primary">{fmtNum(scm?.logistics_kpis?.returns_completed)}</strong></div>
          <div className="adm-kv-row"><span>Handover Pending</span><strong className="adm-text-warn">{fmtNum(scm?.logistics_kpis?.handover_pending)}</strong></div>
          <div className="adm-kv-row"><span>Return Pending</span><strong className="adm-text-warn">{fmtNum(scm?.logistics_kpis?.return_pending)}</strong></div>
          <div className="adm-kv-row"><span>Disputed Orders</span><strong className="adm-text-danger">{fmtNum(scm?.logistics_kpis?.disputed_orders)}</strong></div>
        </div>
      </div>
    </div>
  );
};

const DecisionsTab = ({ data }) => {
  if (!data) return <EmptyState icon="insights" message="No decision support data available" />;
  const trend = (data?.sales_trend || []).slice(-14);
  const maxGmv = Math.max(...trend.map(t => t.gmv || 0), 1);
  return (
    <div className="adm-tab-content">
      <SectionHeader icon="insights" title="Decision Support" />
      <div className="adm-stats-grid">
        <StatCard icon="payments" label="30-Day GMV" value={fmtINR(data?.kpis?.gmv)} sub={`${fmtINR(data?.kpis?.platform_commission)} commission`} accent />
        <StatCard icon="percent" label="Completion Rate" value={`${data?.kpis?.completion_rate_percent || 0}%`} sub={`${fmtNum(data?.kpis?.bookings_completed)} completed`} />
        <StatCard icon="credit_card" label="Payment Success" value={`${data?.payment_kpis?.payment_success_rate_percent || 0}%`} sub={`${fmtNum(data?.payment_kpis?.successful_booking_payments)} payments`} />
        <StatCard icon="receipt" label="Invoice Coverage" value={`${data?.invoice_kpis?.delivery_coverage_percent || 0}%`} sub={`${fmtNum(data?.invoice_kpis?.invoices_generated)} invoices`} />
      </div>

      {trend.length > 0 && (
        <div className="adm-card" style={{ marginTop: '20px' }}>
          <SectionHeader icon="show_chart" title="Sales Trend (Last 14 Days)" />
          <div className="adm-timeline-chart">
            {trend.map((t, i) => (
              <div key={i} className="adm-timeline-col">
                <div className="adm-timeline-bar-wrap">
                  <div className="adm-timeline-bar" style={{ height: `${Math.max(4, Math.round((t.gmv / maxGmv) * 80))}px` }} title={`${t.date}: ${fmtINR(t.gmv)}`} />
                </div>
                <span className="adm-timeline-label">{String(t.date).slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="adm-overview-grid adm-overview-grid--2" style={{ marginTop: '16px' }}>
        {(data?.host_actions || []).length > 0 && (
          <div className="adm-card">
            <SectionHeader icon="warning" title="Host Actions Needed" />
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>Host</th><th>Conversion</th><th>Action</th></tr></thead>
                <tbody>
                  {data.host_actions.slice(0, 8).map((h) => (
                    <tr key={h.host_id}>
                      <td><div className="adm-user-cell"><div className="adm-avatar-sm">{h.username?.[0]?.toUpperCase()}</div>{h.username}</div></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, height: '4px', background: 'var(--adm-surface-high)', borderRadius: '999px', overflow: 'hidden', minWidth: '40px' }}>
                            <div style={{ height: '100%', width: `${h.conversion_rate}%`, background: h.conversion_rate < 30 ? 'var(--adm-danger)' : 'var(--adm-warn-bg)', borderRadius: '999px' }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: h.conversion_rate < 30 ? 'var(--adm-danger)' : 'var(--adm-warn)' }}>{h.conversion_rate}%</span>
                        </div>
                      </td>
                      <td className="adm-text-muted adm-text-sm">{h.recommended_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(data?.recommendations || []).length > 0 && (
          <div className="adm-card">
            <SectionHeader icon="lightbulb" title="Recommendations" />
            <ul className="adm-rec-list">
              {data.recommendations.map((r, i) => (
                <li key={i} className="adm-rec-item">
                  <span className="material-symbols-outlined">arrow_forward</span>{r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ icon, message }) => (
  <div className="adm-empty">
    <span className="material-symbols-outlined">{icon}</span>
    <p>{message}</p>
  </div>
);

export default AdminDashboard;
