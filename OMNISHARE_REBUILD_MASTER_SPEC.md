# OmniShare - Complete Rebuild Master Specification

## 1. Document Purpose
This document is a full technical handoff of the OmniShare codebase so another IDE, AI coding agent, or engineering team can rebuild an equivalent website/application from scratch.

Use this as the source of truth for:
- Product scope
- Architecture decisions
- Data model and business rules
- API contracts
- Frontend page and route behavior
- Payment, escrow, and commission logic
- Security controls
- Deployment strategy

## 2. Product Definition
OmniShare is a P2P rental marketplace where users can list assets and other users can book rentals by date range.

Core personas:
- Guest: Browse and rent listed items
- Host: Create/manage listings and fulfill bookings
- Admin: KYC verification, listing moderation, dispute handling, analytics/revenue reporting

Core value proposition:
- Trust-oriented rental flow with KYC, trust scores, disputes, and QR-based handover/return verification
- Built-in escrow model and commission split
- Admin CRM/ERP style insights and operations

## 3. High-Level Architecture
### Frontend
- React 18 SPA
- React Router v6
- Clerk authentication UI/session
- Axios for API communication
- Framer Motion for route transitions
- React Toastify for notifications

### Backend
- Django 4.2.7
- Django REST Framework
- TokenAuthentication (DRF token)
- Role + KYC based permission checks
- Booking services with lock-based anti-double-booking

### Datastores
- Primary relational DB: SQLite in development (with PostgreSQL-ready settings)
- Optional MongoDB hook in settings for analytics/non-relational use
- Local media storage for uploaded files (KYC docs, listing images, QR images)

### Payment
- Razorpay integrated
- Escrow, transactions, invoices, settlements, refund pipeline

## 4. Repository Topology
Root folders and their intent:
- omnishare_backend/: Django backend
- omnishare_frontend/: React frontend
- stitch_omnishare_prd/: Product/design artifacts
- deployment files at root: netlify.toml, firebase.json, Docker-related backend files

Backend Django apps:
- users: auth profile KYC trust-score notifications gold host logic
- listings: categories listing CRUD moderation images reviews promotions
- bookings: booking lifecycle QR handover/return dispute/cancel analytics
- payments: orders verification escrow invoices settlements webhook logs
- crm: dashboard/reporting/customer and decision support
- marketing: lead capture referral code/stats

## 5. Runtime and Environments
Observed local runtime conventions:
- Backend API: http://localhost:8001
- Frontend web app: http://localhost:3002 (can vary by port availability)

Frontend API base URL behavior:
- Reads REACT_APP_API_URL
- Falls back to http://localhost:8001/api

Backend URL root behavior:
- / redirects to /admin/
- /healthz/ returns status ok
- /api/ returns endpoint index

## 6. Dependency Stack
### Backend Python dependencies
- Django==4.2.7
- djangorestframework==3.14.0
- django-cors-headers==4.3.1
- Pillow==11.2.1
- razorpay==1.4.1
- stripe==11.1.0
- qrcode==7.4.2
- reportlab==4.0.7
- firebase-admin==6.6.0
- psycopg[binary]==3.2.13
- pymongo==4.6.0
- python-decouple==3.8
- python-dotenv==1.0.0
- gunicorn==21.2.0

### Frontend dependencies
- react, react-dom, react-scripts
- react-router-dom
- axios
- @clerk/react
- react-toastify
- framer-motion
- recharts
- date-fns
- leaflet/react-leaflet
- react-dropzone
- qrcode.react
- firebase

## 7. Core Domain Models
## 7.1 User model (custom)
Key fields:
- email (unique)
- role: guest | host | both | admin
- kyc_status: pending | verified | rejected | not_submitted
- trust_score (0 to 5)
- loyalty_coins
- booking counters (total/successful/cancelled/disputed)
- gold_host_flag and gold_host_since

Behavior highlights:
- can_create_listing requires host-capable role and verified KYC
- can_book currently allows guest-capable role (KYC relaxed in demo flow)
- trust score recalculated from booking outcomes
- gold host eligibility based on threshold constants

## 7.2 Listing model
Key fields:
- host (FK User)
- title, description
- category (FK Category)
- daily_price, deposit
- insurance_plan: basic | standard | premium
- location, optional lat/long/address
- availability_start, availability_end, is_available
- verification_status: pending | approved | rejected
- rating, total_reviews, total_bookings
- promoted_flag/promotion end

Behavior:
- is_bookable requires available + approved listing + host KYC verified
- update_rating aggregates review ratings

## 7.3 Booking model
Status machine:
- pending
- confirmed
- in_use
- returned
- disputed
- completed
- cancelled

Core fields:
- listing, guest, host
- start_date, end_date, rental_days
- financial fields: rental_amount, commission_host, commission_guest, platform_commission, deposit, insurance_fee, guest_total, host_payout
- escrow_status and booking_status
- qr_code + qr_token
- dispute and cancellation metadata

Creation behavior:
- financial amounts auto-calculated on creation
- QR token/image generated on creation

Financial formulas:
- commission_host = rental_amount * 0.12
- commission_guest = rental_amount * 0.06
- platform_commission = commission_host + commission_guest (18%)
- guest_total = rental_amount + commission_guest + deposit + insurance_fee
- host_payout = rental_amount - commission_host

## 7.4 Payment domain models (enhanced)
- EscrowAccount: active/released/refunded states
- CommissionSplit: detailed accounting snapshot
- Transaction: booking_payment/deposit/refund/payout/etc
- Settlement: post-escrow host settlement
- Invoice: generated after successful payment and booking progression
- WebhookLog: payment gateway webhook tracking

## 8. Business Rules and Constants
From backend settings:
- PLATFORM_COMMISSION_HOST = 0.12
- PLATFORM_COMMISSION_GUEST = 0.06
- TOTAL_PLATFORM_COMMISSION = 0.18
- MINIMUM_BOOKING_HOURS = 24
- CANCELLATION_WINDOW_HOURS = 48
- GOLD_HOST_BOOKINGS_THRESHOLD = 10
- GOLD_HOST_RATING_THRESHOLD = 4.5

Important UX/business note:
- Frontend cart checkout page also applies:
  - delivery fee = 15% of subtotal
  - transaction fee = 18% of subtotal
- This cart checkout flow is separate from booking engine math and currently localStorage-centric for order confirmation path.

## 9. Booking and Availability Engine
Primary anti-conflict logic in booking services:
- Overlap check against active bookings with date range intersection
- Excludes cancelled/disputed/completed from collision checks
- Uses temporary BookingDateLock records to avoid race conditions
- create_booking_with_lock wraps creation in transaction.atomic
- Utility to return blocked dates for calendar UI
- Price calculator endpoint returns granular cost breakdown

Date overlap condition equivalent:
- requested_start < existing_end AND requested_end > existing_start

## 10. QR Fulfillment Design
Booking generates qr_token and qr_code image.
Intended operational flow:
- Host confirms booking
- Handover endpoint validates QR proof, transitions to in_use
- Return endpoint validates QR proof, transitions to returned
- Completion endpoint settles escrow path and marks completed

## 11. API Surface (Rebuild Contract)
Base backend API prefix: /api

### 11.1 Users API
- POST /api/users/register/
- POST /api/users/login/
- POST /api/users/clerk-sync-login/
- POST /api/users/logout/
- GET/PUT /api/users/profile/
- PATCH /api/users/kyc/submit/
- POST /api/users/kyc/verify/
- GET /api/users/kyc/pending/
- GET /api/users/trust-score/
- GET /api/users/trust-score/{user_id}/
- POST /api/users/trust-scores/update-all/
- GET /api/users/notifications/
- POST /api/users/notifications/{id}/read/
- POST /api/users/notifications/{id}/open/
- POST /api/users/notifications/{id}/claim/
- GET /api/users/gold-hosts/

### 11.2 Listings API
- GET /api/listings/categories/
- GET /api/listings/
- GET /api/listings/{id}/
- GET /api/listings/promoted/
- POST /api/listings/create/
- PUT /api/listings/{id}/update/
- DELETE /api/listings/{id}/delete/
- GET /api/listings/my-listings/
- POST /api/listings/{listing_id}/images/
- GET /api/listings/pending/
- POST /api/listings/verify/
- POST /api/listings/{listing_id}/promote/
- POST /api/listings/reviews/create/
- GET /api/listings/{listing_id}/reviews/

### 11.3 Bookings API
- POST /api/bookings/create/
- GET /api/bookings/my-bookings/
- GET /api/bookings/{id}/
- POST /api/bookings/{booking_id}/confirm/
- POST /api/bookings/handover/
- POST /api/bookings/return/
- POST /api/bookings/{booking_id}/complete/
- POST /api/bookings/raise-dispute/
- POST /api/bookings/resolve-dispute/
- GET /api/bookings/disputed/
- GET /api/bookings/admin/orders/
- POST /api/bookings/cancel/
- GET /api/bookings/blocked-dates/{listing_id}/
- POST /api/bookings/calculate-price/
- GET /api/bookings/statistics/

### 11.4 Payments API
Routed by DRF router under /api/payments/

Primary actions used by frontend:
- POST /api/payments/payments/checkout-preview/
- POST /api/payments/payments/create-order/
- POST /api/payments/payments/verify/
- POST /api/payments/payments/refund/
- GET /api/payments/payments/transactions/
- GET /api/payments/payments/settlements/
- GET /api/payments/invoices/
- GET /api/payments/invoices/{invoice_id}/download/
- POST /api/payments/invoices/{invoice_id}/resend_email/
- POST /api/payments/payments/stripe-create-session/
- POST /api/payments/payments/stripe-verify-session/
- POST /api/payments/payments/demo-complete/

### 11.5 CRM API
- GET /api/crm/dashboard/
- GET /api/crm/revenue-report/
- GET /api/crm/user-analytics/
- GET /api/crm/customers/
- GET /api/crm/customers/{user_id}/
- GET /api/crm/sales-report/
- GET /api/crm/inventory-linkage/
- GET /api/crm/scm-dashboard/
- GET /api/crm/decision-support/

### 11.6 Marketing API
- POST /api/marketing/leads/capture/
- GET /api/marketing/referral-code/
- GET /api/marketing/referral-stats/

## 12. Frontend Architecture and Routes
Main providers in App:
- ThemeProvider
- CartProvider

Auth/session model:
- Clerk handles signed-in state
- App syncs Clerk user to backend via /users/clerk-sync-login/
- Backend returns DRF token, stored as localStorage access_token
- Axios request interceptor sends Authorization: Token <token>

Route map:
Public:
- /
- /clerk/sign-in
- /clerk/sign-up
- /listings/all
- /listings/:id
- /crm
- /scm
- /demo/customer
- /demo/admin

Protected:
- /host/dashboard
- /guest/dashboard
- /listings/create
- /kyc/submit
- /profile
- /bookings/:id
- /payments/:bookingId
- /notifications

Admin protected:
- /admin/dashboard
- /admin/erp
- /admin/revenue

Cart flow routes:
- /cart
- /checkout
- /order-confirmation

## 13. Checkout and Revenue UX Modules
### 13.1 Checkout page (cart-based)
Current implementation is a 3-step UI:
1. Review items
2. Delivery address
3. Payment method (Razorpay or demo)

Cart checkout pricing currently computes:
- subtotal from cart context
- delivery fee = subtotal * 0.15
- transaction fee = subtotal * 0.18
- final amount = subtotal + delivery fee + transaction fee

Payment handlers:
- Demo mode persists orders in localStorage key omnishare_orders
- Razorpay mode opens Razorpay Checkout and stores order after success callback

### 13.2 Revenue dashboard
Admin revenue page displays grouped streams:
- Transaction fee/commission-derived revenue
- Subscription revenue (Gold host style plan)
- Sponsored/promoted listing revenue
- Insurance partner revenue

Source endpoint used by frontend:
- adminAPI.getDashboard() -> /api/crm/dashboard/

## 14. Client-Side State and Persistence
localStorage keys used by frontend:
- access_token
- user
- omnishare_cart
- omnishare_orders

Cart reducer supports:
- ADD_ITEM
- REMOVE_ITEM
- UPDATE_QUANTITY
- CLEAR_CART
- LOAD_FROM_STORAGE

## 15. Security Posture (Implemented)
Backend security controls present:
- DRF token auth and session auth support
- custom throttle classes and rates (user, anon, payment, login, booking, lead capture)
- CORS allowlist via env
- production SSL/HSTS/cookie hardening when DEBUG=False
- role/KYC checks in business methods and views

Additional hardening expectations for rebuild:
- enforce strict object-level permissions in all mutation endpoints
- ensure payment callbacks are always server-verified
- rotate all committed keys and use secret manager
- centralize input validation and sanitize user content uploads

## 16. Environment Variables Contract
### Frontend expected vars
- REACT_APP_API_URL
- REACT_APP_CLERK_PUBLISHABLE_KEY
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- REACT_APP_RAZORPAY_KEY_ID
- Firebase public config keys

### Backend expected vars
- SECRET_KEY
- DEBUG
- ALLOWED_HOSTS
- CORS_ALLOWED_ORIGINS
- CSRF_TRUSTED_ORIGINS
- DATABASE_URL (optional, for PostgreSQL)
- MONGODB_URL (optional)
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_USE_DEMO
- FRONTEND_BASE_URL
- CLERK_SECRET_KEY
- CLERK_PUBLISHABLE_KEY

Important:
- Treat all current checked-in keys as compromised for production and rotate before public deployment.

## 17. Deployment Blueprint
### Frontend deployment options
Netlify config already defined:
- base: omnishare_frontend
- build: npm ci && npm run build
- publish: build
- SPA redirect: /* -> /index.html 200

Firebase hosting config also present:
- public dir: omnishare_frontend/build
- rewrite all routes to index.html

### Backend deployment options
- Dockerfile present, uses python:3.11-slim
- run.sh performs migrate + collectstatic + gunicorn start
- Procfile available for PaaS

Production recommendation:
- Use managed PostgreSQL
- Persist media uploads via object storage (S3/GCS/etc)
- Place backend behind reverse proxy with TLS

## 18. Build and Run Instructions
### Local backend
1. Create and activate virtual environment
2. pip install -r requirements.txt
3. cd omnishare_backend
4. python manage.py migrate
5. python manage.py runserver 8001

### Local frontend
1. cd omnishare_frontend
2. npm install
3. set PORT=3002 (Windows shell env)
4. npm start

## 19. Rebuild Plan for a New Website
If rebuilding in another stack, preserve these invariants first:

Phase 1 - Core platform
- User auth with role model
- Listing CRUD with moderation state
- Booking creation with date overlap prevention
- Booking lifecycle transitions and audit timestamps

Phase 2 - Money movement
- Payment order creation
- Signature verification
- Escrow ledger model
- Commission math and host payout pipeline
- Refund flow

Phase 3 - Trust and operations
- KYC submission and admin verification
- Trust score + Gold host derivation
- Dispute raise/resolve workflow
- Notifications pipeline

Phase 4 - Commercial modules
- Revenue dashboard and reporting
- Promoted listing pipeline
- Referral and lead capture

Phase 5 - UX parity and polish
- Multi-step checkout
- Cart persistence
- Admin dashboards
- Responsive and accessibility improvements

## 20. Suggested Target Architecture for New Implementation
Recommended if using a modern replacement stack:
- Frontend: Next.js or React + Vite
- Backend: Django/DRF (parity) or Node/Nest/Express with equivalent domain model
- DB: PostgreSQL mandatory
- Queue: Celery/RQ/BullMQ for invoice emails, settlement jobs, retries
- Cache: Redis for throttling and ephemeral locks
- Observability: structured logs + metrics + error tracking

## 21. Critical Consistency Rules
Keep these consistent regardless of framework:
- Booking status transitions must be validated server-side
- Money fields must use decimal/fixed precision, never float storage
- Every payment event should be idempotent
- Every dispute/refund/settlement action must be auditable
- Date overlap checks must be transaction-safe to prevent double booking

## 22. Known Gaps and Reconciliation Items
When rebuilding, account for these observed realities:
- Frontend cart checkout logic and backend booking payment logic are two partially separate paths and may need unification
- Existing health endpoints differ between places (/healthz/ vs container health check path)
- Some demo-mode behavior is intentionally permissive for presentation and should be hardened in production
- Ensure consistent port/env defaults across frontend and backend

## 23. Data Migration Guidance
If migrating live data to a new implementation:
1. Export users, listings, bookings, payments, invoices, disputes in dependency order
2. Map enum/status values exactly
3. Recompute derived aggregates (trust scores, dashboard counters)
4. Validate financial totals per booking before cutover
5. Run dual-write or read-only freeze window during switchover

## 24. QA and Acceptance Checklist
Functional:
- User registration/login sync with backend token
- Listing lifecycle works end-to-end
- Booking availability prevents overlap race
- Payment verify marks booking correctly
- Refund path updates transaction and escrow statuses
- Admin can verify KYC/listings and resolve disputes

Financial:
- Commission split outputs expected values
- Host payout and guest totals reconcile
- Revenue dashboard totals match transaction ledger

Security:
- Protected endpoints reject unauthorized requests
- Role and ownership checks enforced
- Rate limits active on auth/payment/bookings
- Secrets not exposed in client bundles except public keys

Performance:
- Listing and dashboard endpoints paginated
- Indexes exist for frequently filtered fields
- API remains responsive under concurrent booking attempts

## 25. Quick Start Prompt for Another AI IDE
Use this prompt verbatim to bootstrap another coding assistant:

"Build a production-grade P2P rental marketplace named OmniShare using this specification. Implement role-based users (guest/host/admin), listing management with moderation, booking state machine (pending -> confirmed -> in_use -> returned -> completed, plus disputed/cancelled), transaction-safe date locking to prevent double booking, Razorpay order creation and signature verification, escrow and commission split (12% host + 6% guest), KYC workflow, trust score and Gold host program, dispute management, admin CRM/revenue dashboards, promoted listings, referral/lead capture, and a React SPA with protected routes, cart, and multi-step checkout. Preserve API compatibility listed in this document and produce migration-ready SQL schema plus integration tests for booking and payment critical paths." 

## 26. Final Notes
This spec is intentionally implementation-oriented. If you are rebuilding from zero, prioritize preserving business behavior and data contracts over line-by-line UI parity.

For production launch, mandatory next actions are:
- secret rotation
- payment/webhook hardening
- test coverage for lifecycle and money movement
- observability and incident response hooks
