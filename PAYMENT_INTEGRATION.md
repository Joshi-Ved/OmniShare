# OmniShare Payment Integration Guide

## 1) Overview

OmniShare uses a **multi-gateway payment flow** for booking checkout:

- **Razorpay Sandbox** (primary online checkout)
- **Stripe Sandbox / Demo mode** (alternate checkout)
- **Instant Demo API** (internal/demo-only completion path)

The integration is split across:

- **Backend (Django + DRF)** for order/session creation, verification, escrow, transactions, refunds, invoice generation, and settlements.
- **Frontend (React)** for payment UI, gateway selection, and post-payment navigation.

---

## 2) Payment Architecture

### Frontend components

- `omnishare_frontend/src/pages/PaymentPage.jsx`
  - Main checkout page (`/payments/:bookingId`)
  - Loads booking + checkout preview
  - Lets user choose gateway: Demo / Razorpay / Stripe
  - Starts payment and handles success/cancel states
- `omnishare_frontend/src/components/RazorpayPaymentModal.jsx`
  - Modal variant for Razorpay + demo trigger
- `omnishare_frontend/src/services/api.js`
  - Central API client and `paymentsAPI` methods
- `omnishare_frontend/src/services/razorpayService.js`
  - Razorpay utility wrapper used by UI flows

### Backend modules

- `omnishare_backend/payments/views_enhanced.py`
  - `PaymentViewSet`: checkout preview, create order/session, verify, refunds, transaction/settlement listing
  - `InvoiceViewSet`: list/download/resend invoice
  - `WebhookViewSet`: Razorpay webhook intake + logging
- `omnishare_backend/payments/payment_services.py`
  - `RazorpayService`, `StripeService`, `EscrowService`, `InvoiceService`, `SettlementService`
- `omnishare_backend/payments/models.py`
  - `Transaction`, `EscrowAccount`, `CommissionSplit`, `Settlement`, `Invoice`, `WebhookLog`
- `omnishare_backend/payments/urls.py`
  - DRF router registration + legacy routes

---

## 3) API Endpoints Used in Current Frontend

All frontend calls are under base: `http://localhost:8001/api`

### PaymentViewSet endpoints

- `POST /api/payments/payments/checkout-preview/`
- `POST /api/payments/payments/create-order/`
- `POST /api/payments/payments/stripe-create-session/`
- `POST /api/payments/payments/demo-complete/`
- `POST /api/payments/payments/verify/`
- `POST /api/payments/payments/stripe-verify-session/`
- `POST /api/payments/payments/refund/`
- `GET /api/payments/payments/transactions/`
- `GET /api/payments/payments/settlements/`

### Invoice endpoints

- `GET /api/payments/invoices/`
- `GET /api/payments/invoices/{invoiceId}/download/`
- `POST /api/payments/invoices/{invoiceId}/resend_email/`

### Legacy endpoints (still present)

- `POST /api/payments/create-order/<booking_id>/`
- `POST /api/payments/verify/`
- `GET /api/payments/transactions/`

---

## 4) End-to-End Flow

## A. Checkout preview

1. Frontend calls `checkoutPreview(bookingId)`.
2. Backend validates booking ownership (`guest=request.user`) and returns:
   - listing info
   - date range
   - full amount breakdown (`guest_total`, deposit, insurance, commissions)

## B. Create payment intent

Depending on selected gateway:

- **Razorpay**: `createOrder(bookingId)`
  - Creates Razorpay order via `RazorpayService.create_order`
  - Creates/ensures escrow
  - Creates `Transaction(status='pending', transaction_type='booking_payment')`
- **Stripe**: `createStripeSession(bookingId)`
  - Creates Stripe checkout session (or demo session when enabled)
  - Creates pending transaction with gateway metadata
- **Demo**: `demoCompletePayment(bookingId)`
  - Creates pending transaction and immediately finalizes success

## C. Payment verification and booking confirmation

- **Razorpay**:
  1. Razorpay checkout returns `razorpay_payment_id`, `razorpay_signature`, `razorpay_order_id`
  2. Frontend calls `verifyPayment(...)`
  3. Backend verifies signature using `RazorpayService.verify_signature`

- **Stripe**:
  1. User returns from Stripe Checkout to `/payments/:bookingId?...`
  2. Frontend calls `verifyStripeSession(...)`
  3. Backend verifies session state via `StripeService.verify_checkout_session`

On successful verification, backend uses `_finalize_successful_booking_payment(...)` to:

1. Mark transaction `success`
2. Confirm booking (`booking.confirm_booking()`) if still pending
3. Generate invoice (`InvoiceService.generate_invoice`)
4. Attempt invoice email dispatch
5. Create host settlement if escrow is active

---

## 5) Data Model and Money Lifecycle

### Transaction

Stores each payment event:

- `booking_payment`, `refund`, etc.
- status lifecycle: `pending -> success/failed/refunded`
- gateway IDs (`razorpay_order_id`, `razorpay_payment_id`, signatures)

### EscrowAccount

Holds guest funds during active booking lifecycle.

- Created on payment initiation
- Supports release to host or refund to guest

### CommissionSplit

Records platform economics per booking:

- host commission (12%)
- guest commission (6%)
- total commission (18%)

### Settlement

Tracks host payout records from released escrow.

### Invoice

Generated on successful payment finalization.

- PDF generation + download endpoint
- email send/resend support

### WebhookLog

Stores incoming Razorpay webhook payloads and processing state.

---

## 6) Security and Validation Rules

- Most payment endpoints require authenticated user (`IsAuthenticated`).
- Checkout and payment actions ensure user is booking guest (`guest=request.user`).
- Payment initiation is restricted to `booking_status == 'pending'`.
- Duplicate successful payments are blocked by checking existing success transactions.
- Razorpay signature verification is mandatory in verify flow.
- Refunds are permission-checked (guest/host/admin).

---

## 7) Configuration (Environment / Settings)

From `omnishare_backend/omnishare/settings.py`:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_USE_DEMO`
- `FRONTEND_BASE_URL`

Also used in pricing:

- `PLATFORM_COMMISSION_HOST = 0.12`
- `PLATFORM_COMMISSION_GUEST = 0.06`
- `TOTAL_PLATFORM_COMMISSION = 0.18`

---

## 8) Frontend Integration Notes

`paymentsAPI` methods in `src/services/api.js` are already aligned to enhanced backend routes.

Primary payment screen behavior (`PaymentPage.jsx`):

- Loads checkout data on mount
- Supports all 3 gateways
- Handles Razorpay modal callback and backend verification
- Handles Stripe return URL verification
- Navigates back to booking page with `paymentSuccess` and `invoiceNumber`

---

## 9) Refund and Webhook Handling

### Refund

- Endpoint: `POST /api/payments/payments/refund/`
- Creates a refund via Razorpay service
- Creates a refund transaction record
- Updates original payment transaction to `refunded`
- Refunds escrow when applicable

### Webhook

- Endpoint: `POST /api/payments/webhooks/razorpay_webhook/`
- Persists webhook event in `WebhookLog`
- On `payment.failed`, marks matching transaction as failed

---

## 10) Quick Test Checklist

1. Create booking (status = `pending`)
2. Open `/payments/:bookingId`
3. Verify checkout preview values
4. Test **Demo payment** -> booking becomes `confirmed`, invoice created
5. Test **Razorpay sandbox** payment -> verify callback + transaction success
6. Test **Stripe sandbox/demo** -> return URL verification success
7. Download invoice from invoice endpoint
8. Trigger refund and confirm transaction + escrow updates
9. Confirm transaction history and settlement endpoints return expected records

---

## 11) Current Integration Summary

OmniShare payment integration is implemented as a **stateful server-verified flow** where frontend only initiates checkout and backend owns:

- order/session creation
- payment verification
- booking confirmation state transition
- escrow + commission accounting
- invoice generation
- settlement records
- refund processing
- webhook logging

This keeps financial state authoritative on the backend and reduces tampering risk from client-side flows.
