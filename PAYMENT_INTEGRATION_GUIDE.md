# Experiment 5: Payment Integration - Complete Guide

## Overview

This guide documents the complete payment integration implementation for OmniShare, including:
- Razorpay sandbox integration
- Escrow account management
- Commission split tracking
- Invoice PDF generation
- Transaction logging
- Webhook handling
- Settlement/payout module

## Architecture

### Payment Flow

```
User Initiates Booking
    ↓
POST /api/payments/create-order/ → Razorpay Order Created
    ↓
Frontend Displays Razorpay Modal
    ↓
User Pays via Razorpay
    ↓
POST /api/payments/verify/ → Signature Verified
    ↓
Transaction Created (PENDING → SUCCESS)
    ↓
Escrow Account Funded
    ↓
Commission Split Calculated
    ↓
Invoice Generated
    ↓
Webhook: payment.authorized
    ↓
Settlement Created (For Host Payout)
```

### Escrow System

**Purpose**: Hold guest payment securely until booking completion

**Status Transitions**:
- `active` → Money held after successful payment
- `released` → Host payout triggered after stay completion
- `refunded` → Guest receives full refund on cancellation
- `disputed` → Manual intervention required

**Commission Breakdown** (per ₹100 booking):
- Guest Pays: ₹106 (100 rental + 6% commission)
- Platform Takes: ₹18 (12% host + 6% guest)
- Host Receives: ₹88 (100 - 12%)

### Settlement Process

1. **After Booking Completion**: Settlement created with status `pending`
2. **Batch Processing**: Run settlement processor to:
   - Verify host Razorpay account
   - Calculate payout amount
   - Create Razorpay transfer
3. **Webhook Confirmation**: Razorpay webhook confirms settlement
4. **Host Receives**: Funds transferred to host's Razorpay account

## API Endpoints

### Payment Endpoints

#### 1. Create Payment Order
```
POST /api/payments/create-order/
```

**Request**:
```json
{
    "booking_id": 123
}
```

**Response** (201):
```json
{
    "order_id": "order_KLAKf1234567",
    "amount": 10600,
    "currency": "INR",
    "transaction_id": 456,
    "razorpay_key_id": "rzp_test_xxxxxx",
    "booking": {
        "id": 123,
        "listing": "Studio Apartment",
        "start_date": "2024-02-01",
        "end_date": "2024-02-05"
    }
}
```

#### 2. Verify Payment
```
POST /api/payments/verify/
```

**Request**:
```json
{
    "razorpay_order_id": "order_KLAKf1234567",
    "razorpay_payment_id": "pay_KLAKf1234567",
    "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

**Response** (200):
```json
{
    "message": "Payment successful",
    "transaction": {
        "id": 456,
        "booking": 123,
        "amount": 10600,
        "status": "success",
        "razorpay_payment_id": "pay_KLAKf1234567",
        "processed_at": "2024-01-15T10:30:00Z"
    },
    "booking_id": 123
}
```

#### 3. Create Refund
```
POST /api/payments/refund/
```

**Request**:
```json
{
    "booking_id": 123,
    "reason": "cancellation",
    "amount": 10600
}
```

**Response** (201):
```json
{
    "message": "Refund processed successfully",
    "refund_id": "rfnd_KLAKf1234567",
    "amount": 10600,
    "transaction": {
        "id": 789,
        "amount": 10600,
        "status": "success",
        "transaction_type": "refund",
        "razorpay_refund_id": "rfnd_KLAKf1234567"
    }
}
```

#### 4. Get User Transactions
```
GET /api/payments/transactions/
```

**Response** (200):
```json
[
    {
        "id": 456,
        "booking": 123,
        "booking_details": {
            "id": 123,
            "listing_title": "Studio Apartment",
            "start_date": "2024-02-01",
            "end_date": "2024-02-05",
            "guest_name": "John Doe",
            "host_name": "Jane Smith"
        },
        "amount": 10600,
        "status": "success",
        "transaction_type": "payment",
        "payment_gateway": "razorpay",
        "razorpay_payment_id": "pay_KLAKf1234567",
        "processed_at": "2024-01-15T10:30:00Z",
        "created_at": "2024-01-15T10:00:00Z"
    }
]
```

#### 5. Get User Settlements
```
GET /api/payments/settlements/
```

**Response** (200):
```json
[
    {
        "id": 1,
        "user": 2,
        "user_name": "Jane Smith",
        "escrow": 1,
        "settlement_type": "escrow_release",
        "amount": 8800,
        "status": "completed",
        "processed_at": "2024-01-20T15:45:00Z",
        "razorpay_transfer_id": "tfrx_KLAKf1234567",
        "created_at": "2024-01-15T10:30:00Z"
    }
]
```

### Invoice Endpoints

#### 1. Get Invoices
```
GET /api/invoices/
```

#### 2. Resend Invoice Email
```
POST /api/invoices/{id}/resend_email/
```

**Response** (200):
```json
{
    "message": "Invoice sent successfully",
    "email": "guest@example.com"
}
```

#### 3. Download Invoice PDF
```
GET /api/invoices/{id}/download/
```

**Response**: PDF file download

### Webhook Endpoints

#### 1. Razorpay Webhook Handler
```
POST /api/webhooks/razorpay_webhook/
```

**Handled Events**:
- `payment.authorized`: Payment successfully captured
- `payment.failed`: Payment failed
- `refund.created`: Refund processed
- `settlement.processed`: Settlement transferred

**Webhook Response** (200):
```json
{
    "message": "Webhook processed successfully"
}
```

## Models

### Transaction
Tracks all payment transactions (payments, refunds)

```python
{
    "id": 456,
    "booking": 123,
    "user": 1,
    "amount": 10600,
    "status": "success",  # pending, success, failed, processing
    "transaction_type": "payment",  # payment, refund
    "payment_gateway": "razorpay",
    "razorpay_order_id": "order_...",
    "razorpay_payment_id": "pay_...",
    "razorpay_refund_id": "rfnd_...",
    "refund_status": "not_refunded",  # not_refunded, refunded, partial_refunded
    "processed_at": "2024-01-15T10:30:00Z"
}
```

### EscrowAccount
Holds guest payment in escrow

```python
{
    "id": 1,
    "booking": 123,
    "guest": 1,
    "host": 2,
    "total_amount": 10600,
    "rental_amount": 10000,
    "guest_commission": 600,
    "host_commission": 1200,
    "platform_revenue": 1800,
    "status": "active",  # active, released, refunded, disputed
    "held_until": "2024-02-05T23:59:59Z",
    "released_at": null,
    "refunded_at": null
}
```

### CommissionSplit
Detailed commission breakdown

```python
{
    "id": 1,
    "booking": 123,
    "escrow": 1,
    "rental_amount": 10000,
    "commission_host": 1200,
    "commission_guest": 600,
    "total_commission": 1800,
    "guest_total": 10600,
    "host_payout": 8800,
    "platform_earnings": 1800
}
```

### Settlement
Host payout tracking

```python
{
    "id": 1,
    "user": 2,  # Host
    "escrow": 1,
    "settlement_type": "escrow_release",
    "amount": 8800,
    "status": "pending",  # pending, processing, completed, failed
    "processed_at": "2024-01-20T15:45:00Z",
    "razorpay_transfer_id": "tfrx_..."
}
```

### Invoice
Generated invoices for bookings

```python
{
    "id": 1,
    "booking": 123,
    "guest": 1,
    "host": 2,
    "invoice_number": "INV-123-20240115",
    "invoice_date": "2024-01-15",
    "due_date": "2024-01-22",
    "subtotal": 10000,
    "platform_commission": 600,
    "total_amount": 10600,
    "pdf_generated": true,
    "pdf_file": "/media/invoices/...",
    "sent_to_guest": true
}
```

### WebhookLog
Audit trail for webhooks

```python
{
    "id": 1,
    "webhook_id": "evt_...",
    "event_type": "payment.authorized",
    "payload": {...},
    "ip_address": "192.168.1.1",
    "verified": true,
    "processed": true
}
```

## Service Classes

### RazorpayService
Handles all Razorpay API operations

```python
from payments.payment_services import RazorpayService

razorpay = RazorpayService()

# Create order
order = razorpay.create_order(booking)

# Verify signature
is_valid = razorpay.verify_signature(order_id, payment_id, signature)

# Fetch payment details
payment = razorpay.fetch_payment(payment_id)

# Create refund
refund = razorpay.create_refund(payment_id, amount)

# Transfer to host
transfer = razorpay.transfer_funds(account_id, amount, notes)
```

### EscrowService
Manages escrow accounts

```python
from payments.payment_services import EscrowService

escrow_service = EscrowService()

# Create escrow
escrow = escrow_service.create_escrow(booking)

# Release to host
escrow = escrow_service.release_escrow(booking)

# Refund to guest
escrow = escrow_service.refund_escrow(booking, amount)
```

### InvoiceService
Generates and sends invoices

```python
from payments.payment_services import InvoiceService

invoice_service = InvoiceService()

# Generate invoice
invoice = invoice_service.generate_invoice(booking)

# Send invoice email
invoice_service.send_invoice_email(invoice)
```

### SettlementService
Processes host settlements

```python
from payments.payment_services import SettlementService

settlement_service = SettlementService()

# Create settlement
settlement = settlement_service.create_settlement(escrow)

# Process settlement (create Razorpay transfer)
settlement = settlement_service.process_settlement(settlement)

# Get pending settlements
pending = settlement_service.get_pending_settlements(user)

# Get statistics
stats = settlement_service.get_settlement_stats(user, date_from, date_to)
```

## Configuration

### Required Settings (settings.py)

```python
# Razorpay Configuration
RAZORPAY_KEY_ID = 'rzp_test_xxxxxx'
RAZORPAY_KEY_SECRET = 'xxxxxx'
RAZORPAY_WEBHOOK_SECRET = 'xxxxxx'

# Payment Configuration
PAYMENT_SETTINGS = {
    'GUEST_COMMISSION': Decimal('0.06'),  # 6%
    'HOST_COMMISSION': Decimal('0.12'),   # 12%
    'ESCROW_HOLD_DAYS': 1,                # Hold for 1 day after booking
    'SETTLEMENT_BATCH_SIZE': 50,          # Process 50 settlements at a time
}

# Email Configuration
DEFAULT_FROM_EMAIL = 'noreply@omnishare.com'
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
```

## Testing Guide

### 1. Test Payment Flow

**Step 1: Create Order**
```bash
curl -X POST http://localhost:8001/api/payments/create-order/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"booking_id": 1}'
```

**Step 2: Verify Payment** (After Razorpay payment in sandbox)
```bash
curl -X POST http://localhost:8001/api/payments/verify/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "razorpay_order_id": "order_...",
    "razorpay_payment_id": "pay_...",
    "razorpay_signature": "..."
  }'
```

### 2. Test Refund
```bash
curl -X POST http://localhost:8001/api/payments/refund/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "booking_id": 1,
    "reason": "cancellation",
    "amount": 10600
  }'
```

### 3. Test Invoice Download
```bash
curl -X GET http://localhost:8001/api/invoices/1/download/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output invoice.pdf
```

### 4. Test Webhook
```bash
curl -X POST http://localhost:8001/api/webhooks/razorpay_webhook/ \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.authorized",
    "id": "evt_...",
    "payload": {
      "payment": {
        "id": "pay_...",
        "status": "authorized"
      }
    }
  }'
```

## Razorpay Sandbox Testing

### Test Cards

**Success Card**:
- Card Number: 4111111111111111
- Expiry: Any future date (e.g., 12/25)
- CVV: 123
- OTP: 000000

**Failed Card**:
- Card Number: 4222222222222220
- Expiry: Any future date
- CVV: 123

### Razorpay Dashboard
- Login: https://dashboard.razorpay.com
- Access test payments, settlements, webhooks

## Database Migrations

### Create migrations for new models
```bash
python manage.py makemigrations payments
```

### Apply migrations
```bash
python manage.py migrate payments
```

## Settlement Processing

### Manual Settlement Processing

```python
from payments.payment_services import SettlementService
from payments.models_enhanced import Settlement

settlement_service = SettlementService()

# Get all pending settlements
pending = Settlement.objects.filter(status='pending')

for settlement in pending[:10]:  # Process 10 at a time
    try:
        settlement_service.process_settlement(settlement)
    except Exception as e:
        print(f"Failed to process settlement {settlement.id}: {e}")
```

### Automated Settlement Processing (Celery)

```python
# payments/tasks.py
from celery import shared_task
from payments.payment_services import SettlementService

@shared_task
def process_pending_settlements():
    settlement_service = SettlementService()
    pending = settlement_service.get_pending_settlements()[:50]
    
    for settlement in pending:
        try:
            settlement_service.process_settlement(settlement)
        except Exception as e:
            print(f"Settlement failed: {e}")
```

## Troubleshooting

### Payment Verification Fails
1. Check Razorpay key and secret
2. Verify signature format
3. Check webhook logs in database
4. Verify order ID matches

### Escrow Not Released
1. Check escrow status
2. Verify booking completion date
3. Check settlement status
4. Review WebhookLog for errors

### Invoice PDF Not Generated
1. Install ReportLab: `pip install reportlab`
2. Check file permissions in media directory
3. Verify Django media settings
4. Check email configuration

### Webhook Not Processed
1. Verify webhook signature
2. Check webhook logs
3. Verify IP whitelist
4. Check Razorpay webhook settings

## Security Considerations

1. **Always verify Razorpay signatures** before processing payments
2. **Use HTTPS** in production
3. **Store Razorpay keys** in environment variables
4. **Implement rate limiting** on payment endpoints
5. **Log all transactions** for audit trail
6. **Use atomic transactions** to prevent race conditions
7. **Validate webhook IPs** from Razorpay
8. **Encrypt sensitive data** in metadata

## Performance Optimization

1. **Batch settlement processing** instead of real-time
2. **Use database indexes** on commonly queried fields
3. **Cache escrow calculations**
4. **Async invoice generation** with Celery
5. **Optimize webhook processing** with message queues

## Future Enhancements

1. **Dispute Resolution**: Add escrow holds for disputes
2. **Partial Refunds**: Support partial refund processing
3. **Settlement Scheduling**: Schedule settlements on specific days
4. **Invoice Customization**: Support custom invoice templates
5. **Payment Analytics**: Dashboard with payment insights
6. **Subscription Billing**: Support recurring payments
7. **Currency Support**: Support multiple currencies
8. **Payment Methods**: Add UPI, Net Banking, Wallet support
