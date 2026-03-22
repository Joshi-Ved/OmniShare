import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { toast } from 'react-toastify';
import './Dashboard.css';

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
  const [inventory, setInventory] = useState(null);
  const [basicInventory, setBasicInventory] = useState([]);
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('all');
  const [scm, setScm] = useState(null);
  const [decisionSupport, setDecisionSupport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        listingsRes,
        kycRes,
        disputesRes,
        ordersRes,
        customersRes,
        salesRes,
        inventoryRes,
        scmRes,
        decisionRes,
      ] = await Promise.all([
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
      setInventory(inventoryRes.data);
      const inventoryRows = (inventoryRes.data?.inventory_linkage || []).slice(0, 80).map((item) => ({
        ...item,
        sku: `SKU-${item.listing_id}`,
        stock: Math.max(1, Math.round((item.utilization_percent ?? 0) / 10) || 1),
        status: item.is_available ? 'available' : 'maintenance',
      }));
      setBasicInventory(inventoryRows);
      setScm(scmRes.data);
      setDecisionSupport(decisionRes.data);
    } catch (error) {
      toast.error('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyListing = async (listingId, status) => {
    try {
      await adminAPI.verifyListing({
        listing_id: listingId,
        status,
        remarks: status === 'approved' ? 'Verified' : 'Does not meet requirements',
      });
      toast.success(`Listing ${status}`);
      fetchDashboardData();
    } catch {
      toast.error('Failed to verify listing');
    }
  };

  const handleVerifyKYC = async (userId, status) => {
    try {
      await adminAPI.verifyKYC({ user_id: userId, status, remarks: '' });
      toast.success(`KYC ${status}`);
      fetchDashboardData();
    } catch {
      toast.error('Failed to verify KYC');
    }
  };

  const handleResolveDispute = async (bookingId, refundToGuest) => {
    const resolution = prompt('Enter resolution details:');
    if (!resolution) return;

    try {
      await adminAPI.resolveDispute({
        booking_id: bookingId,
        resolution,
        refund_to_guest: refundToGuest,
      });
      toast.success('Dispute resolved');
      fetchDashboardData();
    } catch {
      toast.error('Failed to resolve dispute');
    }
  };

  const handleApplyOrderFilters = async () => {
    try {
      const response = await adminAPI.getOrders({
        status: orderStatusFilter || undefined,
        search: orderSearch || undefined,
      });
      setOrders(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch {
      toast.error('Failed to filter orders');
    }
  };

  const updateInventoryItem = (listingId, updates) => {
    setBasicInventory((prev) =>
      prev.map((item) => (item.listing_id === listingId ? { ...item, ...updates } : item))
    );
  };

  const filteredInventory = basicInventory.filter((item) => {
    const text = `${item.title || ''} ${item.host || ''} ${item.sku || ''}`.toLowerCase();
    const matchesQuery = text.includes(inventoryQuery.toLowerCase());
    const matchesStatus = inventoryStatusFilter === 'all' || item.status === inventoryStatusFilter;
    return matchesQuery && matchesStatus;
  });

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="admin-hero card">
          <div>
            <h1>Admin Control Center</h1>
            <p>Operations, ERP insights, CRM intelligence, and governance in one place.</p>
          </div>
          <div className="admin-hero-actions">
            <Link to="/admin/erp" className="btn btn-secondary">Open ERP + CRM Workspace</Link>
            <button onClick={fetchDashboardData} className="btn btn-primary">Refresh Data</button>
          </div>
        </div>

        <div className="dashboard-tabs" style={{ flexWrap: 'wrap' }}>
          {[
            ['overview', 'Overview'],
            ['listings', `Pending Listings (${pendingListings.length})`],
            ['kyc', `Pending KYC (${pendingKYC.length})`],
            ['disputes', `Disputes (${disputes.length})`],
            ['orders', `Orders (${orders.length})`],
            ['basic_inventory', `Basic Inventory (${basicInventory.length})`],
            ['customers', 'Customers'],
            ['sales', 'Sales Report'],
            ['inventory', 'Inventory Linkage'],
            ['scm', 'SCM Control'],
            ['decisions', 'Decision Support'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`tab ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div>
            <div className="dashboard-stats grid grid-4">
              <div className="stat-card card">
                <h3>Total Users</h3>
                <p className="stat-number">{stats?.users?.total || 0}</p>
              </div>
              <div className="stat-card card">
                <h3>Total Listings</h3>
                <p className="stat-number">{stats?.listings?.total || 0}</p>
              </div>
              <div className="stat-card card">
                <h3>Total Bookings</h3>
                <p className="stat-number">{stats?.bookings?.total || 0}</p>
              </div>
              <div className="stat-card card">
                <h3>Platform Revenue</h3>
                <p className="stat-number">₹{(stats?.revenue?.total_platform_revenue || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="card">
                <h3>Users</h3>
                <p>Verified: {stats?.users?.verified || 0}</p>
                <p>Gold Hosts: {stats?.users?.gold_hosts || 0}</p>
              </div>
              <div className="card">
                <h3>Bookings</h3>
                <p>Completed: {stats?.bookings?.completed || 0}</p>
                <p>Active: {stats?.bookings?.active || 0}</p>
                <p>Disputed: {stats?.bookings?.disputed || 0}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'listings' && (
          <div className="grid grid-2">
            {pendingListings.map((listing) => (
              <div key={listing.id} className="listing-card card">
                <h3>{listing.title}</h3>
                <p>{listing.description?.substring(0, 100)}...</p>
                <p><strong>Price:</strong> ₹{listing.daily_price}/day</p>
                <div className="listing-actions">
                  <button onClick={() => handleVerifyListing(listing.id, 'approved')} className="btn btn-secondary">Approve</button>
                  <button onClick={() => handleVerifyListing(listing.id, 'rejected')} className="btn btn-danger">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'kyc' && (
          <div className="bookings-list">
            {pendingKYC.map((user) => (
              <div key={user.id} className="booking-card card">
                <h3>{user.username}</h3>
                <p>Email: {user.email}</p>
                <p>Role: {user.role}</p>
                <div className="listing-actions">
                  <button onClick={() => handleVerifyKYC(user.id, 'verified')} className="btn btn-secondary">Verify</button>
                  <button onClick={() => handleVerifyKYC(user.id, 'rejected')} className="btn btn-danger">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'disputes' && (
          <div className="bookings-list">
            {disputes.map((booking) => (
              <div key={booking.id} className="booking-card card">
                <h3>Booking #{booking.id} - {booking.listing_title}</h3>
                <p><strong>Guest:</strong> {booking.guest_name}</p>
                <p><strong>Host:</strong> {booking.host_name}</p>
                <p><strong>Reason:</strong> {booking.dispute_reason}</p>
                <div className="listing-actions">
                  <button onClick={() => handleResolveDispute(booking.id, false)} className="btn btn-secondary">Favor Host</button>
                  <button onClick={() => handleResolveDispute(booking.id, true)} className="btn btn-warning">Refund Guest</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="card">
            <h2>Order Management</h2>
            <div className="order-toolbar">
              <input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search by order id, listing, guest or host"
              />
              <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_use">In Use</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="disputed">Disputed</option>
              </select>
              <button className="btn btn-primary" onClick={handleApplyOrderFilters}>Apply</button>
            </div>

            <div className="orders-grid">
              <div className="stat-card card">
                <h3>Total Orders</h3>
                <p className="stat-number">{orders.length}</p>
              </div>
              <div className="stat-card card">
                <h3>Disputed Orders</h3>
                <p className="stat-number">{orders.filter((o) => o.dispute_flag).length}</p>
              </div>
              <div className="stat-card card">
                <h3>Completed Orders</h3>
                <p className="stat-number">{orders.filter((o) => o.booking_status === 'completed').length}</p>
              </div>
            </div>

            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Listing</th>
                    <th>Guest</th>
                    <th>Host</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 80).map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{order.listing_title || 'Listing'}</td>
                      <td>{order.guest_name || '-'}</td>
                      <td>{order.host_name || '-'}</td>
                      <td>
                        <span className={`badge ${order.booking_status === 'completed' ? 'badge-success' : order.booking_status === 'disputed' ? 'badge-danger' : order.booking_status === 'cancelled' ? 'badge-warning' : 'badge-info'}`}>
                          {order.booking_status}
                        </span>
                      </td>
                      <td>₹{Number(order.guest_total || 0).toFixed(2)}</td>
                      <td>
                        {order.booking_status === 'disputed' ? (
                          <button className="btn btn-warning" onClick={() => handleResolveDispute(order.id, false)}>Resolve</button>
                        ) : (
                          <span className="order-action-muted">No action</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'basic_inventory' && (
          <div className="card">
            <h2>Basic Inventory System</h2>
            <div className="inventory-toolbar">
              <input
                value={inventoryQuery}
                onChange={(e) => setInventoryQuery(e.target.value)}
                placeholder="Search by listing, host or SKU"
              />
              <select value={inventoryStatusFilter} onChange={(e) => setInventoryStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div className="orders-grid">
              <div className="stat-card card">
                <h3>Total Items</h3>
                <p className="stat-number">{filteredInventory.length}</p>
              </div>
              <div className="stat-card card">
                <h3>Available</h3>
                <p className="stat-number">{filteredInventory.filter((i) => i.status === 'available').length}</p>
              </div>
              <div className="stat-card card">
                <h3>Maintenance</h3>
                <p className="stat-number">{filteredInventory.filter((i) => i.status === 'maintenance').length}</p>
              </div>
            </div>

            <div className="orders-table-wrap">
              <table className="orders-table inventory-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Item</th>
                    <th>Host</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.slice(0, 120).map((item) => (
                    <tr key={item.listing_id}>
                      <td>{item.sku}</td>
                      <td>{item.title}</td>
                      <td>{item.host}</td>
                      <td>
                        <div className="inventory-stepper">
                          <button className="btn btn-secondary" onClick={() => updateInventoryItem(item.listing_id, { stock: Math.max(0, (item.stock || 0) - 1) })}>-</button>
                          <span>{item.stock}</span>
                          <button className="btn btn-secondary" onClick={() => updateInventoryItem(item.listing_id, { stock: (item.stock || 0) + 1 })}>+</button>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${item.status === 'available' ? 'badge-success' : item.status === 'maintenance' ? 'badge-warning' : 'badge-info'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div className="listing-actions">
                          <button className="btn btn-secondary" onClick={() => updateInventoryItem(item.listing_id, { status: 'available' })}>Set Available</button>
                          <button className="btn btn-warning" onClick={() => updateInventoryItem(item.listing_id, { status: 'maintenance' })}>Maintenance</button>
                          <button className="btn btn-primary" onClick={() => updateInventoryItem(item.listing_id, { status: 'rented' })}>Mark Rented</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="card">
            <h2>Customer Management</h2>
            <div className="bookings-list">
              {customers.slice(0, 20).map((customer) => (
                <div key={customer.id} className="booking-card card">
                  <h3>{customer.username}</h3>
                  <p><strong>Role:</strong> {customer.role}</p>
                  <p><strong>KYC:</strong> {customer.kyc_status}</p>
                  <p><strong>Trust:</strong> {customer.trust_score}</p>
                  <p><strong>Guest Spend:</strong> ₹{customer.guest_spend}</p>
                  <p><strong>Host Revenue:</strong> ₹{customer.host_revenue}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sales' && sales && (
          <div className="card">
            <h2>Sales Report</h2>
            <p><strong>Bookings Created:</strong> {sales?.totals?.bookings_created || 0}</p>
            <p><strong>Bookings Completed:</strong> {sales?.totals?.bookings_completed || 0}</p>
            <p><strong>GMV:</strong> ₹{sales?.totals?.gmv || 0}</p>
            <p><strong>Platform Commission:</strong> ₹{sales?.totals?.platform_commission || 0}</p>
            <p><strong>Completion Rate:</strong> {sales?.totals?.completion_rate || 0}%</p>
            {(sales?.timeline || []).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3>Timeline</h3>
                {(sales.timeline || []).slice(0, 8).map((bucket) => (
                  <div key={bucket.label} className="booking-card card" style={{ marginTop: 8 }}>
                    <p><strong>{bucket.label}</strong></p>
                    <p>Created: {bucket.created} | Completed: {bucket.completed} | Cancelled: {bucket.cancelled}</p>
                    <p>GMV: ₹{bucket.gmv} | Commission: ₹{bucket.platform_commission}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && inventory && (
          <div className="card">
            <h2>Inventory Linkage</h2>
            <p><strong>Total Listings:</strong> {inventory?.summary?.total_listings || 0}</p>
            <p><strong>Available Listings:</strong> {inventory?.summary?.available_listings || 0}</p>
            <p><strong>High Risk Listings:</strong> {inventory?.summary?.high_risk_listings || 0}</p>
            <p><strong>Total Linked Revenue:</strong> ₹{inventory?.summary?.total_linked_revenue || 0}</p>
            {(inventory?.inventory_linkage || []).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3>Top Inventory Signals</h3>
                {(inventory.inventory_linkage || []).slice(0, 8).map((item) => (
                  <div key={item.listing_id} className="booking-card card" style={{ marginTop: 8 }}>
                    <p><strong>{item.title}</strong> ({item.category || 'Uncategorized'})</p>
                    <p>Host: {item.host} | Utilization: {item.utilization_percent}% | Risk: {item.inventory_risk}</p>
                    <p>Revenue: ₹{item.generated_revenue} | Completed: {item.completed_bookings}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'scm' && scm && (
          <div className="card">
            <h2>ERP-SCM Control Tower</h2>
            <p><strong>Inventory Nodes:</strong> {scm?.scm_summary?.total_inventory_nodes || 0}</p>
            <p><strong>Available Nodes:</strong> {scm?.scm_summary?.available_inventory_nodes || 0}</p>
            <p><strong>Window Orders:</strong> {scm?.scm_summary?.window_completed_orders || 0}</p>
            <p><strong>Window GMV:</strong> ₹{scm?.scm_summary?.window_gmv || 0}</p>

            <h3 style={{ marginTop: 16 }}>Procurement Signals</h3>
            {(scm?.procurement_signals || []).slice(0, 10).map((item) => (
              <div key={item.listing_id} className="booking-card card" style={{ marginTop: 8 }}>
                <p><strong>{item.title}</strong> ({item.category})</p>
                <p>Signal: {item.signal} | Demand Score: {item.demand_score}</p>
                <p>{item.reason}</p>
              </div>
            ))}

            <h3 style={{ marginTop: 16 }}>Supplier Performance</h3>
            {(scm?.supplier_performance || []).slice(0, 10).map((supplier) => (
              <div key={supplier.host_id} className="booking-card card" style={{ marginTop: 8 }}>
                <p><strong>{supplier.username}</strong></p>
                <p>Fill Rate: {supplier.fill_rate_percent}% | Disputes: {supplier.dispute_count}</p>
                <p>GMV: ₹{supplier.gmv} | Risk: {supplier.risk_band}</p>
              </div>
            ))}

            <h3 style={{ marginTop: 16 }}>Logistics KPIs</h3>
            <p>Handover Completed: {scm?.logistics_kpis?.handover_completed || 0}</p>
            <p>Returns Completed: {scm?.logistics_kpis?.returns_completed || 0}</p>
            <p>Handover Pending: {scm?.logistics_kpis?.handover_pending || 0}</p>
            <p>Return Pending: {scm?.logistics_kpis?.return_pending || 0}</p>
            <p>Disputed Orders: {scm?.logistics_kpis?.disputed_orders || 0}</p>
          </div>
        )}

        {activeTab === 'decisions' && decisionSupport && (
          <div className="card">
            <h2>Decision Support Dashboard</h2>
            <p><strong>30-Day GMV:</strong> ₹{decisionSupport?.kpis?.gmv || 0}</p>
            <p><strong>Commission:</strong> ₹{decisionSupport?.kpis?.platform_commission || 0}</p>
            <p><strong>Disputes:</strong> {decisionSupport?.kpis?.disputes || 0}</p>
            <p><strong>Payment Success Rate:</strong> {decisionSupport?.payment_kpis?.payment_success_rate_percent || 0}%</p>
            <p><strong>Invoices Generated:</strong> {decisionSupport?.invoice_kpis?.invoices_generated || 0}</p>
            <p><strong>Invoice PDF Coverage:</strong> {decisionSupport?.invoice_kpis?.delivery_coverage_percent || 0}%</p>

            <h3 style={{ marginTop: 16 }}>Payment and Invoice KPIs</h3>
            <p>Successful Payments: {decisionSupport?.payment_kpis?.successful_booking_payments || 0}</p>
            <p>Failed Payments: {decisionSupport?.payment_kpis?.failed_booking_payments || 0}</p>
            <p>Refunds Processed: {decisionSupport?.payment_kpis?.refunds_processed || 0}</p>

            {(decisionSupport?.sales_trend || []).length > 0 && (
              <>
                <h3 style={{ marginTop: 16 }}>Sales Trend (Last 30 Days)</h3>
                {(decisionSupport.sales_trend || []).slice(-7).map((point) => (
                  <div key={point.date} className="booking-card card" style={{ marginTop: 8 }}>
                    <p><strong>{point.date}</strong></p>
                    <p>Completed Bookings: {point.completed_bookings}</p>
                    <p>GMV: ₹{point.gmv} | Commission: ₹{point.platform_commission}</p>
                    <p>Successful Payments: {point.successful_payments}</p>
                  </div>
                ))}
              </>
            )}

            {(decisionSupport.host_actions || []).length > 0 && (
              <>
                <h3 style={{ marginTop: 16 }}>Host Actions</h3>
                {(decisionSupport.host_actions || []).slice(0, 10).map((item) => (
                  <div key={item.host_id} className="booking-card card" style={{ marginTop: 8 }}>
                    <p><strong>{item.username}</strong></p>
                    <p>Conversion Rate: {item.conversion_rate}%</p>
                    <p>{item.recommended_action}</p>
                  </div>
                ))}
              </>
            )}

            <h3 style={{ marginTop: 16 }}>Recommendations</h3>
            <ul>
              {(decisionSupport.recommendations || []).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
