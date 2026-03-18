import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { toast } from 'react-toastify';
import './Dashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [pendingListings, setPendingListings] = useState([]);
  const [pendingKYC, setPendingKYC] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState(null);
  const [inventory, setInventory] = useState(null);
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
      setCustomers(customersRes.data.results || []);
      setSales(salesRes.data);
      setInventory(inventoryRes.data);
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

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard-page">
      <div className="container">
        <h1>Admin Dashboard</h1>

        <div className="dashboard-tabs" style={{ flexWrap: 'wrap' }}>
          {[
            ['overview', 'Overview'],
            ['listings', `Pending Listings (${pendingListings.length})`],
            ['kyc', `Pending KYC (${pendingKYC.length})`],
            ['disputes', `Disputes (${disputes.length})`],
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
