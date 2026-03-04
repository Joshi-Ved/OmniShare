# Design and Development Navigation Guide
## OmniShare – P2P Rental Marketplace

This document helps you navigate the project phase-by-phase and verify completion of required deliverables.

---

## 1) Implementation of Order Management and Basic Inventory System

### Scope to verify
- Booking creation and lifecycle management
- Host/guest booking actions
- Basic inventory protection against double booking
- Booking status visibility in dashboards

### Where to navigate (UI)
1. Open `http://localhost:3000`
2. Go to **Explore** (Home page)
3. Open any listing details page
4. Select booking dates and create booking
5. Open **Guest Dashboard** → booking appears with status
6. Open **Host Dashboard** → manage same booking
7. Open booking details page (`/bookings/:id`) and perform state transitions

### API/Backend modules
- `bookings/models.py` (booking state machine, QR token, dispute/cancel flows)
- `bookings/services.py` (availability check, date locks, blocked dates)
- `bookings/views.py` (create, confirm, handover, return, complete)
- `bookings/urls.py`

### Completion check
- ✅ Booking flow implemented
- ✅ State transitions implemented (`pending -> confirmed -> in_use -> returned -> completed`)
- ✅ Basic inventory/date locking implemented (`BookingDateLock` + blocked dates)
- ✅ Host/guest dashboards consume booking data

**Status:** DONE

---

## 2) Design and Implementation of Online Payment System

### Scope to verify
- Demo/sandbox payment integration
- Checkout flow
- Payment verification
- Invoice generation

### Where to navigate (UI)
1. Create booking from listing
2. Open booking details (`/bookings/:id`)
3. Click **Pay Now**
4. Use payment page (`/payments/:bookingId`)
5. Complete Razorpay checkout flow (sandbox)
6. On success, return to booking details

### API/Backend modules
- `payments/views_enhanced.py`
  - `checkout-preview`
  - `create-order`
  - `verify`
  - `refund`
  - invoices + webhooks
- `payments/payment_services.py`
  - Razorpay order/signature handling
  - Escrow creation/release/refund
  - Invoice PDF generation + email dispatch
- `payments/models.py`
  - `Transaction`, `EscrowAccount`, `CommissionSplit`, `Invoice`, `Settlement`, `WebhookLog`
- `payments/serializers_enhanced.py`

### Frontend wiring
- `src/services/api.js` (payment endpoints)
- `src/pages/PaymentPage.jsx` (checkout and verification UI)
- `src/pages/BookingPage.jsx` (entry to payment flow)

### Completion check
- ✅ Payment gateway integration (sandbox-ready via Razorpay)
- ✅ Checkout flow implemented
- ✅ Verification flow implemented
- ✅ Invoice generation implemented (PDF + record)

**Status:** DONE

---

## 3) Integration of ERP and CRM Concepts in E-Business Application

### Scope to verify
- Customer management
- Sales reports
- Inventory linkage
- Decision-support dashboards
- Should be extensive

### Where to navigate (UI)
1. Login as Admin
2. Open `/admin/dashboard`
3. Use tabs:
   - Overview
   - Pending Listings
   - Pending KYC
   - Disputes
   - Customers
   - Sales Report
   - Inventory Linkage
   - Decision Support

### API/Backend modules (extensive)
- `crm/views.py`
  - `dashboard_analytics`
  - `customer_management`
  - `customer_detail`
  - `sales_report`
  - `inventory_linkage_report`
  - `decision_support_dashboard`
  - `revenue_report`
  - `user_analytics`
- `crm/urls.py` routes exposed for all above

### Frontend wiring
- `src/pages/AdminDashboard.jsx` (all tabs mapped)
- `src/services/api.js` (CRM endpoints added)

### Completion check
- ✅ Customer management implemented
- ✅ Sales reporting implemented (totals + grouped timeline)
- ✅ Inventory linkage implemented (utilization/risk/revenue linkage)
- ✅ Decision-support dashboard implemented (KPI + recommendations)

**Status:** DONE (Extensive implementation delivered)

---

## End-to-End Validation Flow (Recommended)

1. Register a new user
2. Login
3. Browse listings
4. Create booking
5. Open booking details
6. Complete payment flow
7. Confirm booking lifecycle from host side
8. Login as admin
9. Review CRM/ERP dashboards and reports

---

## Final Progress Matrix

| Requirement | Status |
|---|---|
| Order Management | ✅ Complete |
| Basic Inventory System | ✅ Complete |
| Online Payment Integration | ✅ Complete |
| Checkout + Invoice Flow | ✅ Complete |
| CRM Concepts | ✅ Complete |
| ERP Linkage + Decision Dashboard | ✅ Complete |

---

## Notes
- Backend now uses token-based authentication (`Token ...`) for API flow.
- Database was reset and migrated from clean state.
- Run backend on `8001` and frontend on `3000` before testing.

---

## Ready-to-Use Test Profiles

Use these IDs/passwords to navigate and verify each module quickly.

| Role | Login ID (Email) | Password | Purpose |
|---|---|---|---|
| Admin | admin@omnishare.test | Admin@12345 | CRM/ERP dashboards, KYC/listing verification, disputes |
| Host | host@omnishare.test | Host@12345 | Create/manage listings, booking lifecycle, host operations |
| Guest | guest@omnishare.test | Guest@12345 | Browse listings, create booking, payment checkout |
| Both | both@omnishare.test | Both@12345 | Test combined guest + host flows in one account |

### Seeded Test Data
- Category: `Electronics`
- Approved Listing (by host): `Canon DSLR Camera - Test Listing`

### Quick Navigation by Profile
1. Login as **Guest** → Explore listing → create booking → open `/payments/:bookingId` and test checkout flow.
2. Login as **Host** → open Host Dashboard → confirm/handover/return/complete booking.
3. Login as **Admin** → open Admin Dashboard tabs (Customers, Sales Report, Inventory Linkage, Decision Support).
4. Login as **Both** → verify same user can access both guest and host journey.
