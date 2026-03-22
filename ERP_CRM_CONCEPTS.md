# OmniShare — ERP & CRM Concepts

## About OmniShare

OmniShare is a peer-to-peer asset rental marketplace built for the Indian market. It lets individuals and businesses list physical assets — tools, equipment, vehicles, electronics, and more — for short-term rental. Guests browse and book items; hosts earn by renting out what they own. The platform handles the full lifecycle: discovery, booking, payment, physical handover, return, and settlement — with a trust and verification layer on top to keep both sides accountable.

The backend is Django REST Framework. The frontend is React. Payments run through Razorpay. Authentication is Firebase. The admin and analytics layer is a custom ERP/CRM system built directly into the Django admin.

---

## ERP Concepts Implemented

### 1. Inventory Management

**Concept:** ERP inventory management tracks the availability, status, and utilization of stock units across a supply chain.

**Our implementation:** Each `Listing` is an inventory node. It carries `is_available`, `verification_status`, `availability_start`, `availability_end`, and `total_bookings`. The `inventory_linkage_report` API aggregates these nodes with their booking outcomes — completed, cancelled, active — and computes a `utilization_percent` per listing. Listings with zero completions in a window are flagged as underperforming inventory. Listings with high cancellations are flagged as `medium` risk; unavailable or unverified ones as `high` risk.

**Endpoint:** `GET /api/crm/inventory-linkage/`

---

### 2. Supply Chain Management (SCM)

**Concept:** SCM in ERP tracks supplier performance, procurement signals, and logistics flow — from supply intake to order fulfillment.

**Our implementation:** Hosts are the suppliers. The `scm_dashboard` API treats each host as a supplier node and computes a `fill_rate_percent` (completed bookings / total bookings in window). Hosts with fill rate below 50% or 2+ disputes are flagged as `high` risk band. Listings with demand score ≥ 4 (active + completed bookings) generate a `restock_priority` procurement signal. Listings with cancellation spikes generate a `supply_risk` signal. Logistics KPIs track handover completions, return completions, and pending handovers/returns directly from booking timestamps (`handover_at`, `return_at`).

**Endpoint:** `GET /api/crm/scm-dashboard/`

---

### 3. Financial Management & Commission Accounting

**Concept:** ERP financial modules track revenue recognition, cost allocation, and multi-party settlements.

**Our implementation:** Every booking auto-calculates a three-way commission split on creation:
- Host commission: 12% deducted from rental amount
- Guest commission: 6% added on top of rental amount
- Platform commission: 18% total (the platform's revenue)

These are stored as discrete fields on `Booking` (`rental_amount`, `commission_host`, `commission_guest`, `platform_commission`, `guest_total`, `host_payout`) and mirrored in `CommissionSplit`. The `revenue_report` API aggregates GMV, total commission, and average booking value over any date range.

---

### 4. Escrow & Settlement Module

**Concept:** ERP treasury management handles fund holding, conditional release, and settlement to counterparties.

**Our implementation:** `EscrowAccount` holds the guest's full payment after booking confirmation. Funds stay in escrow until the booking completes. On completion, `release_to_host()` creates a `Settlement` record for the host payout. On cancellation or dispute resolution in the guest's favour, `refund_to_guest()` creates a `Transaction` of type `refund`. `Settlement` tracks each host payout with a Razorpay transfer ID for reconciliation.

---

### 5. Invoice Generation

**Concept:** ERP billing modules generate structured invoices for each transaction, with line items and PDF delivery.

**Our implementation:** `Invoice` is created per booking with a unique `invoice_number`, subtotal, tax, platform commission, and total. A `pdf_generated` flag tracks whether the PDF has been produced. `sent_to_guest` and `sent_to_host` flags track delivery. Invoice KPIs (total generated, PDF coverage %) are surfaced in the decision support dashboard.

---

### 6. Decision Support Dashboard

**Concept:** ERP decision support aggregates cross-module KPIs and generates actionable recommendations for operations teams.

**Our implementation:** The `decision_support_dashboard` API pulls from bookings, payments, invoices, and users to produce:
- 30-day GMV, commission, completion rate, dispute count
- Payment success/failure rates and refund volume
- Invoice delivery coverage
- A 30-day daily sales trend (bookings + GMV + payments per day)
- Host-level conversion rate analysis with recommended actions for underperformers
- A list of approved, available listings with zero completions (dead inventory)
- Auto-generated text recommendations based on live metric thresholds

**Endpoint:** `GET /api/crm/decision-support/`

---

### 7. Webhook & Audit Logging

**Concept:** ERP systems maintain an immutable audit trail of all financial events for compliance and debugging.

**Our implementation:** `WebhookLog` records every inbound Razorpay webhook — payment authorized, captured, failed, refund created, transfer created, settlement processed — with the full payload, processing status, and timestamps. This provides a complete audit trail of the payment lifecycle.

---

## CRM Concepts Implemented

### 1. Customer 360° Profile

**Concept:** CRM systems maintain a unified view of each customer — their history, value, risk, and current status — accessible to operations teams.

**Our implementation:** The `customer_detail` API returns a full profile for any user: role, KYC status, trust score, gold host flag, guest spend, host revenue, active bookings, and the 10 most recent bookings with full financial breakdown. This is the single-customer view used for support and account management.

**Endpoint:** `GET /api/crm/customers/<user_id>/`

---

### 2. Customer Segmentation & Filtering

**Concept:** CRM segmentation lets teams filter and target customers by behaviour, status, or risk profile.

**Our implementation:** The `customer_management` API supports filtering by `role` (guest/host/both), `kyc_status`, free-text `search` (username or email), and a `risk_only` flag that surfaces users with disputes or trust score below 3.5. Each record includes annotated spend, revenue, booking counts, and active booking count — computed in a single DB query.

**Endpoint:** `GET /api/crm/customers/?role=host&kyc_status=verified&risk_only=true`

---

### 3. Trust Score & Reputation System

**Concept:** CRM reputation management tracks customer reliability over time and adjusts their standing automatically.

**Our implementation:** Every `User` has a `trust_score` (0–5). It is recalculated on every booking completion, cancellation, or dispute via `update_trust_score()`: success rate × 5, minus 0.5 per dispute. Cancelled bookings increment `cancelled_bookings`; disputes increment `disputed_bookings`. The score is surfaced in the customer list, the top hosts table, and the decision support dashboard.

---

### 4. KYC / Identity Verification Workflow

**Concept:** CRM compliance modules manage identity verification to onboard customers and reduce fraud risk.

**Our implementation:** `User` has `kyc_status` (not_submitted / pending / verified / rejected), `kyc_document` file upload, and `kyc_submitted_at` / `kyc_verified_at` timestamps. Hosts cannot create listings unless `kyc_status == 'verified'`. The admin exposes a pending KYC queue at `GET /api/users/kyc/pending/`. The frontend has a dedicated `KYCSubmission` page.

---

### 5. Gold Host Programme

**Concept:** CRM loyalty tiers reward high-performing customers with elevated status and benefits.

**Our implementation:** `check_gold_host_eligibility()` runs after every completed booking. If a host has 10+ successful bookings and an average listing rating ≥ 4.5, `gold_host_flag` is set to `True` and `gold_host_since` is recorded. Gold hosts are surfaced in the top hosts table and tagged with a "Gold Host" badge in the admin dashboard.

---

### 6. Sales Reporting

**Concept:** CRM sales reporting tracks pipeline conversion, revenue by period, and category-level performance.

**Our implementation:** The `sales_report` API accepts `start_date`, `end_date`, and `group_by` (day/week/month). It returns totals (GMV, guest revenue, host payouts, platform commission, average order value, completion rate) plus a bucketed timeline and top categories by GMV. The React ERP dashboard renders this as a bar chart with period selectors.

**Endpoint:** `GET /api/crm/sales-report/?start_date=2026-01-01&end_date=2026-03-22&group_by=week`

---

### 7. Dispute Management

**Concept:** CRM case management tracks customer complaints, assigns resolution workflows, and records outcomes.

**Our implementation:** Any booking in `in_use` or `returned` state can have a dispute raised via `raise_dispute(raised_by, reason)`. This sets `dispute_flag=True`, transitions the booking to `disputed`, records `dispute_raised_by`, `dispute_reason`, and `dispute_raised_at`. Admin resolves via `resolve_dispute(resolution, refund_to_guest)` which closes the case, records the resolution text, and directs escrow to either the host or guest. Dispute counts feed directly into trust score recalculation for both parties.

---

## Data Flow Summary

```
Guest books → Booking created (commission auto-calculated)
           → EscrowAccount created (funds held)
           → CommissionSplit recorded
           → Invoice generated

Host confirms → Booking status: confirmed
Guest receives item → handover_at stamped → status: in_use
Guest returns item → return_at stamped → status: returned

No dispute → complete_booking()
           → EscrowAccount.release_to_host()
           → Settlement created for host
           → Trust scores updated for both parties
           → Gold Host eligibility checked

Dispute raised → status: disputed
              → Admin reviews → resolve_dispute()
              → Escrow directed to winner
              → Trust scores penalised

All payment events → Transaction logged
                  → Razorpay webhooks → WebhookLog
```
