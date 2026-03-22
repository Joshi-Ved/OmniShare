import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { toast } from 'react-toastify';
import './ERPDashboard.css';

const ERPDashboard = () => {
  const [activeModule, setActiveModule] = useState('overview');
  const [data, setData] = useState({
    overview: null,
    inventory: null,
    crm: null,
    sales: null,
    scm: null,
  });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: '30',
    category: 'all',
    status: 'all',
  });

  useEffect(() => {
    fetchERPData();
  }, []);

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

      setData({
        overview: overview.data,
        inventory: inventory.data,
        crm: crm.data?.results || [],
        sales: sales.data,
        scm: scm.data,
      });
    } catch (error) {
      toast.error('Failed to load ERP data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="erp-dashboard">
      <div className="erp-header">
        <div className="erp-header-content">
          <h1>Enterprise Resource Planning</h1>
          <p>Integrated ERP & CRM Management System</p>
        </div>
        <div className="erp-filters">
          <select value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
          <button className="refresh-btn" onClick={fetchERPData} disabled={loading}>
            {loading ? '🔄 Syncing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      <div className="erp-nav">
        <button
          className={`erp-nav-item ${activeModule === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveModule('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`erp-nav-item ${activeModule === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveModule('inventory')}
        >
          📦 Inventory
        </button>
        <button
          className={`erp-nav-item ${activeModule === 'crm' ? 'active' : ''}`}
          onClick={() => setActiveModule('crm')}
        >
          👥 CRM
        </button>
        <button
          className={`erp-nav-item ${activeModule === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveModule('sales')}
        >
          💰 Sales
        </button>
        <button
          className={`erp-nav-item ${activeModule === 'scm' ? 'active' : ''}`}
          onClick={() => setActiveModule('scm')}
        >
          🚚 Supply Chain
        </button>
      </div>

      <div className="erp-content">
        {activeModule === 'overview' && <OverviewModule data={data.overview} />}
        {activeModule === 'inventory' && <InventoryModule data={data.inventory} />}
        {activeModule === 'crm' && <CRMModule data={data.crm} />}
        {activeModule === 'sales' && <SalesModule data={data.sales} />}
        {activeModule === 'scm' && <SCMModule data={data.scm} />}
      </div>
    </div>
  );
};

// Overview Module - High-level KPIs
const OverviewModule = ({ data }) => {
  if (!data) return <div className="module-loading">Loading Overview...</div>;

  const kpis = [
    {
      title: 'Total Revenue',
      value: `$${(data.total_revenue || 0).toLocaleString()}`,
      trend: '+12.5%',
      icon: '💵',
      color: 'green',
    },
    {
      title: 'Active Listings',
      value: data.active_listings || 0,
      trend: '+8 this month',
      icon: '📋',
      color: 'blue',
    },
    {
      title: 'Verified Users',
      value: data.verified_users || 0,
      trend: '+15 this week',
      icon: '✅',
      color: 'purple',
    },
    {
      title: 'Pending Approvals',
      value: data.pending_listings || 0,
      trend: 'Requires action',
      icon: '⏳',
      color: 'orange',
    },
    {
      title: 'Active Bookings',
      value: data.active_bookings || 0,
      trend: '+5 today',
      icon: '🎯',
      color: 'teal',
    },
    {
      title: 'Platform Commission',
      value: `$${(data.total_commission || 0).toLocaleString()}`,
      trend: '+5.2% vs last month',
      icon: '📈',
      color: 'gold',
    },
  ];

  return (
    <div className="overview-module">
      <div className="kpi-grid">
        {kpis.map((kpi, idx) => (
          <div key={idx} className={`kpi-card kpi-${kpi.color}`}>
            <div className="kpi-icon">{kpi.icon}</div>
            <div className="kpi-content">
              <h3>{kpi.title}</h3>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-trend">{kpi.trend}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="overview-section">
        <h2>System Health</h2>
        <div className="health-grid">
          <div className="health-item">
            <div className="health-label">Data Integrity</div>
            <div className="health-bar">
              <div className="health-fill" style={{ width: '98%' }}></div>
            </div>
            <span className="health-percent">98%</span>
          </div>
          <div className="health-item">
            <div className="health-label">Uptime</div>
            <div className="health-bar">
              <div className="health-fill" style={{ width: '99.9%' }}></div>
            </div>
            <span className="health-percent">99.9%</span>
          </div>
          <div className="health-item">
            <div className="health-label">API Response</div>
            <div className="health-bar">
              <div className="health-fill" style={{ width: '97%' }}></div>
            </div>
            <span className="health-percent">97ms</span>
          </div>
          <div className="health-item">
            <div className="health-label">User Satisfaction</div>
            <div className="health-bar">
              <div className="health-fill" style={{ width: '94%' }}></div>
            </div>
            <span className="health-percent">4.7/5</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Inventory Module - Stock & Product Management
const InventoryModule = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  if (!data) return <div className="module-loading">Loading Inventory...</div>;

  const items = (data.inventory_linkage || []).slice(0, 20);

  return (
    <div className="inventory-module">
      <div className="module-header">
        <h2>Inventory Management</h2>
        <div className="inventory-controls">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
            <option value="low">Low Stock</option>
          </select>
          <button className="btn-add">+ Add Item</button>
        </div>
      </div>

      <div className="inventory-stats">
        <div className="stat-box">
          <div className="stat-label">Total Items</div>
          <div className="stat-value">{items.length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Available</div>
          <div className="stat-value">{items.filter((i) => i.is_available).length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Utilization Rate</div>
          <div className="stat-value">{Math.round((data.avg_utilization || 0) * 100)}%</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Stock Value</div>
          <div className="stat-value">${(data.total_value || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="inventory-table">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Stock Level</th>
              <th>Utilization</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td><code>SKU-{item.listing_id}</code></td>
                <td>Item {item.listing_id}</td>
                <td>{item.category || 'Electronics'}</td>
                <td>
                  <span className="stock-level">
                    {Math.max(1, Math.round((item.utilization_percent || 0) / 10))} units
                  </span>
                </td>
                <td>
                  <div className="utilization-bar">
                    <div className="utilization-fill" style={{ width: `${item.utilization_percent || 0}%` }}></div>
                  </div>
                  {((item.utilization_percent || 0) * 100).toFixed(0)}%
                </td>
                <td>
                  <span className={`status-badge status-${item.is_available ? 'active' : 'inactive'}`}>
                    {item.is_available ? '✓ Available' : '⏸ Maintenance'}
                  </span>
                </td>
                <td>
                  <button className="btn-small">Edit</button>
                  <button className="btn-small btn-danger">Archive</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// CRM Module - Customer Relationship Management
const CRMModule = ({ data }) => {
  const [activeTab, setActiveTab] = useState('customers');

  const customers = Array.isArray(data) ? data : [];

  return (
    <div className="crm-module">
      <div className="module-header">
        <h2>Customer Relationship Management</h2>
        <button className="btn-add">+ New Customer</button>
      </div>

      <div className="crm-tabs">
        <button className={`tab ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
          👥 All Customers ({customers.length})
        </button>
        <button
          className={`tab ${activeTab === 'segments' ? 'active' : ''}`}
          onClick={() => setActiveTab('segments')}
        >
          📊 Segments
        </button>
        <button className={`tab ${activeTab === 'interactions' ? 'active' : ''}`} onClick={() => setActiveTab('interactions')}>
          💬 Interactions
        </button>
        <button className={`tab ${activeTab === 'lifecycle' ? 'active' : ''}`} onClick={() => setActiveTab('lifecycle')}>
          🔄 Lifecycle
        </button>
      </div>

      {activeTab === 'customers' && (
        <div className="crm-content">
          <div className="customers-grid">
            {customers.slice(0, 12).map((customer, idx) => (
              <div key={idx} className="customer-card">
                <div className="customer-avatar">{customer.full_name?.[0]?.toUpperCase() || 'U'}</div>
                <div className="customer-details">
                  <h4>{customer.full_name || 'Customer'}</h4>
                  <p className="customer-email">{customer.email}</p>
                  <div className="customer-stats">
                    <span className="stat">Orders: 5</span>
                    <span className="stat">Value: $450</span>
                  </div>
                  <div className="customer-segment">
                    {customer.gold_host_flag ? '⭐ Gold' : '📝 Regular'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'segments' && (
        <div className="crm-content">
          <div className="segments-grid">
            <div className="segment-card">
              <div className="segment-icon">⭐</div>
              <h4>Premium Customers</h4>
              <div className="segment-count">234</div>
              <p>High-value customers with repeat purchases</p>
            </div>
            <div className="segment-card">
              <div className="segment-icon">🆕</div>
              <h4>New Customers</h4>
              <div className="segment-count">89</div>
              <p>First-time renters in last 30 days</p>
            </div>
            <div className="segment-card">
              <div className="segment-icon">😴</div>
              <h4>Inactive Customers</h4>
              <div className="segment-count">156</div>
              <p>No activity in last 90 days</p>
            </div>
            <div className="segment-card">
              <div className="segment-icon">🎯</div>
              <h4>Engaged Hosts</h4>
              <div className="segment-count">412</div>
              <p>Active hosts with listings</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sales Module - Revenue & Analytics
const SalesModule = ({ data }) => {
  return (
    <div className="sales-module">
      <div className="module-header">
        <h2>Sales Analytics & Revenue</h2>
      </div>

      <div className="sales-metrics">
        <div className="metric-card">
          <h3>Total Revenue</h3>
          <div className="metric-value">$125,450</div>
          <div className="metric-change positive">↑ 12.5% vs last month</div>
        </div>
        <div className="metric-card">
          <h3>Average Order Value</h3>
          <div className="metric-value">$285</div>
          <div className="metric-change neutral">→ 2.3% vs last month</div>
        </div>
        <div className="metric-card">
          <h3>Total Orders</h3>
          <div className="metric-value">439</div>
          <div className="metric-change positive">↑ 8.7% vs last month</div>
        </div>
        <div className="metric-card">
          <h3>Conversion Rate</h3>
          <div className="metric-value">3.8%</div>
          <div className="metric-change positive">↑ 0.5% vs last month</div>
        </div>
      </div>

      <div className="sales-breakdown">
        <div className="breakdown-section">
          <h3>Revenue by Category</h3>
          <div className="category-list">
            <div className="category-item">
              <span className="category-name">Electronics</span>
              <div className="category-bar">
                <div className="category-fill" style={{ width: '45%' }}></div>
              </div>
              <span className="category-value">$56,453</span>
            </div>
            <div className="category-item">
              <span className="category-name">Sports & Outdoor</span>
              <div className="category-bar">
                <div className="category-fill" style={{ width: '28%' }}></div>
              </div>
              <span className="category-value">$35,126</span>
            </div>
            <div className="category-item">
              <span className="category-name">Lifestyle</span>
              <div className="category-bar">
                <div className="category-fill" style={{ width: '18%' }}></div>
              </div>
              <span className="category-value">$22,671</span>
            </div>
            <div className="category-item">
              <span className="category-name">Others</span>
              <div className="category-bar">
                <div className="category-fill" style={{ width: '9%' }}></div>
              </div>
              <span className="category-value">$11,200</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Supply Chain Module
const SCMModule = ({ data }) => {
  return (
    <div className="scm-module">
      <div className="module-header">
        <h2>Supply Chain Management</h2>
      </div>

      <div className="scm-pipeline">
        <div className="pipeline-stage">
          <div className="stage-icon">📤</div>
          <h4>Listings Posted</h4>
          <div className="stage-value">156</div>
          <p className="stage-subtitle">This week</p>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-stage">
          <div className="stage-icon">✅</div>
          <h4>Verified Items</h4>
          <div className="stage-value">148</div>
          <p className="stage-subtitle">95% approval</p>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-stage">
          <div className="stage-icon">📦</div>
          <h4>Available Stock</h4>
          <div className="stage-value">1,247</div>
          <p className="stage-subtitle">Ready to rent</p>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-stage">
          <div className="stage-icon">🚚</div>
          <h4>In Transit</h4>
          <div className="stage-value">34</div>
          <p className="stage-subtitle">Delivery pending</p>
        </div>
      </div>

      <div className="scm-details">
        <h3>Logistics Overview</h3>
        <div className="logistics-table">
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Items</th>
                <th>Pickup Requests</th>
                <th>Delivery Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Downtown Hub</td>
                <td>45</td>
                <td>12</td>
                <td>98.5%</td>
                <td><span className="badge-success">✓ Optimal</span></td>
              </tr>
              <tr>
                <td>North District</td>
                <td>32</td>
                <td>8</td>
                <td>96.2%</td>
                <td><span className="badge-success">✓ Optimal</span></td>
              </tr>
              <tr>
                <td>South Zone</td>
                <td>28</td>
                <td>5</td>
                <td>94.1%</td>
                <td><span className="badge-warning">⚠ Monitor</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ERPDashboard;
