# OmniShare Testing Guide

## 📋 Quick Start Testing

### Prerequisites
- Backend running on `http://127.0.0.1:8001`
- Frontend running on `http://localhost:3001`
- Database migrated with: `python manage.py migrate`

---

## 1️⃣ User Authentication Testing

### Test 1.1: User Registration

**Endpoint:** POST `/api/users/register/`

**cURL:**
```bash
curl -X POST http://localhost:8001/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testhost",
    "email": "testhost@example.com",
    "password": "TestPassword123",
    "password2": "TestPassword123",
    "phone_number": "+919876543210",
    "role": "host"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": 1,
    "username": "testhost",
    "email": "testhost@example.com",
    "role": "host",
    "kyc_status": "not_submitted",
    "trust_score": 5.0
  },
  "tokens": {
    "refresh": "eyJ0eXAiOiJKV1...",
    "access": "eyJ0eXAiOiJKV1..."
  },
  "message": "User registered successfully"
}
```

**Save the tokens for next tests!**

### Test 1.2: User Login

**Endpoint:** POST `/api/users/login/`

```bash
curl -X POST http://localhost:8001/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testhost",
    "password": "TestPassword123"
  }'
```

### Test 1.3: Get User Profile

**Endpoint:** GET `/api/users/profile/`

```bash
curl -X GET http://localhost:8001/api/users/profile/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 2️⃣ KYC Verification Testing

### Test 2.1: Submit KYC Documents

**Endpoint:** POST `/api/users/kyc/submit/`

```bash
curl -X POST http://localhost:8001/api/users/kyc/submit/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "document_type=aadhar" \
  -F "document_file=@/path/to/aadhar.pdf" \
  -F "full_name=Test Host" \
  -F "date_of_birth=1990-01-15"
```

### Test 2.2: Admin - View Pending KYC (Admin Only)

**Endpoint:** GET `/api/users/kyc/pending/`

```bash
curl -X GET http://localhost:8001/api/users/kyc/pending/ \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Test 2.3: Admin - Verify KYC

**Endpoint:** POST `/api/users/kyc/verify/`

```bash
curl -X POST http://localhost:8001/api/users/kyc/verify/ \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kyc_id": 1,
    "status": "verified",
    "admin_notes": "Documents verified successfully"
  }'
```

---

## 3️⃣ Listing Management Testing

### Test 3.1: Create a Listing (Verified Host Only)

**Endpoint:** POST `/api/listings/create/`

```bash
curl -X POST http://localhost:8001/api/listings/create/ \
  -H "Authorization: Bearer VERIFIED_HOST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mountain Bike",
    "description": "High-end mountain bike suitable for trails",
    "category": 1,
    "location": "Bangalore, Karnataka",
    "daily_price": "500.00",
    "deposit_required": "2000.00",
    "is_available": true,
    "features": ["Suspension", "Shimano gears", "Lightweight"]
  }'
```

### Test 3.2: Upload Listing Images

**Endpoint:** POST `/api/listings/{listing_id}/images/`

```bash
curl -X POST http://localhost:8001/api/listings/1/images/ \
  -H "Authorization: Bearer HOST_TOKEN" \
  -F "image=@/path/to/bike.jpg" \
  -F "is_primary=true"
```

### Test 3.3: Get All Listings

**Endpoint:** GET `/api/listings/`

```bash
curl -X GET "http://localhost:8001/api/listings/?category=&location=Bangalore&min_price=100&max_price=1000"
```

### Test 3.4: Update Listing

**Endpoint:** PUT `/api/listings/{listing_id}/update/`

```bash
curl -X PUT http://localhost:8001/api/listings/1/update/ \
  -H "Authorization: Bearer HOST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Professional Mountain Bike",
    "daily_price": "600.00"
  }'
```

### Test 3.5: Admin - View Pending Listings

**Endpoint:** GET `/api/listings/pending/`

```bash
curl -X GET http://localhost:8001/api/listings/pending/ \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Test 3.6: Admin - Verify Listing

**Endpoint:** POST `/api/listings/verify/`

```bash
curl -X POST http://localhost:8001/api/listings/verify/ \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listing_id": 1,
    "status": "approved",
    "admin_notes": "Listing verified and approved"
  }'
```

---

## 4️⃣ Booking System Testing

### Test 4.1: Calculate Booking Price

**Endpoint:** POST `/api/bookings/calculate-price/`

```bash
curl -X POST http://localhost:8001/api/bookings/calculate-price/ \
  -H "Authorization: Bearer GUEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listing_id": 1,
    "start_date": "2026-03-01",
    "end_date": "2026-03-05"
  }'
```

**Expected Response:**
```json
{
  "rental_amount": 2000.00,
  "commission_host": 240.00,
  "commission_guest": 120.00,
  "platform_commission": 360.00,
  "deposit": 2000.00,
  "insurance_fee": 100.00,
  "guest_total": 2620.00,
  "host_payout": 1760.00
}
```

### Test 4.2: Check Blocked Dates

**Endpoint:** GET `/api/bookings/blocked-dates/{listing_id}/`

```bash
curl -X GET http://localhost:8001/api/bookings/blocked-dates/1/ \
  -H "Authorization: Bearer GUEST_TOKEN"
```

### Test 4.3: Create a Booking

**Endpoint:** POST `/api/bookings/create/`

```bash
curl -X POST http://localhost:8001/api/bookings/create/ \
  -H "Authorization: Bearer GUEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listing_id": 1,
    "start_date": "2026-03-01",
    "end_date": "2026-03-05"
  }'
```

**Expected Response:**
```json
{
  "message": "Booking created successfully",
  "booking": {
    "id": 1,
    "listing_id": 1,
    "guest_id": 2,
    "host_id": 1,
    "booking_status": "pending",
    "start_date": "2026-03-01",
    "end_date": "2026-03-05",
    "rental_days": 5,
    "guest_total": 2620.00,
    "host_payout": 1760.00,
    "qr_token": "abc123xyz789"
  }
}
```

---

## 5️⃣ Booking State Transitions Testing

### 📊 Booking State Machine

```
pending
  ↓ (Host confirms) → confirmed
                        ↓ (QR Handover)
                      in_use
                        ↓ (QR Return)
                      returned
                        ↓ (Auto-complete after 1 day)
                      completed
       
       OR

       ↓ (Guest raises issue) → disputed → (Admin resolves) → completed

       OR

  ↓ (Cancel before start) → cancelled
```

### Test 5.1: Host Confirms Booking

**Endpoint:** POST `/api/bookings/{booking_id}/confirm/`

```bash
curl -X POST http://localhost:8001/api/bookings/1/confirm/ \
  -H "Authorization: Bearer HOST_TOKEN"
```

### Test 5.2: Handover with QR Code

**Endpoint:** POST `/api/bookings/handover/`

```bash
curl -X POST http://localhost:8001/api/bookings/handover/ \
  -H "Authorization: Bearer HOST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "qr_token": "abc123xyz789"
  }'
```

### Test 5.3: Return with QR Code

**Endpoint:** POST `/api/bookings/return/`

```bash
curl -X POST http://localhost:8001/api/bookings/return/ \
  -H "Authorization: Bearer GUEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "qr_token": "abc123xyz789",
    "condition_notes": "Item returned in perfect condition"
  }'
```

### Test 5.4: Complete Booking

**Endpoint:** POST `/api/bookings/{booking_id}/complete/`

```bash
curl -X POST http://localhost:8001/api/bookings/1/complete/ \
  -H "Authorization: Bearer HOST_TOKEN"
```

---

## 6️⃣ Dispute Management Testing

### Test 6.1: Raise a Dispute

**Endpoint:** POST `/api/bookings/raise-dispute/`

```bash
curl -X POST http://localhost:8001/api/bookings/raise-dispute/ \
  -H "Authorization: Bearer GUEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "reason": "Item not as described",
    "description": "The bike has damage not mentioned in the listing"
  }'
```

### Test 6.2: Admin - View Disputed Bookings

**Endpoint:** GET `/api/bookings/disputed/`

```bash
curl -X GET http://localhost:8001/api/bookings/disputed/ \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Test 6.3: Admin - Resolve Dispute

**Endpoint:** POST `/api/bookings/resolve-dispute/`

```bash
curl -X POST http://localhost:8001/api/bookings/resolve-dispute/ \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "resolution": "refund_full",
    "admin_notes": "Item was damaged. Full refund issued.",
    "refund_amount": 2620.00
  }'
```

---

## 7️⃣ Cancel Booking Testing

### Test 7.1: Cancel Booking

**Endpoint:** POST `/api/bookings/cancel/`

```bash
curl -X POST http://localhost:8001/api/bookings/cancel/ \
  -H "Authorization: Bearer GUEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "reason": "No longer needed"
  }'
```

---

## 8️⃣ Payment Integration Testing

### Test 8.1: Create Razorpay Order

**Endpoint:** POST `/api/payments/create-order/{booking_id}/`

```bash
curl -X POST http://localhost:8001/api/payments/create-order/1/ \
  -H "Authorization: Bearer GUEST_TOKEN"
```

### Test 8.2: Verify Payment

**Endpoint:** POST `/api/payments/verify/`

```bash
curl -X POST http://localhost:8001/api/payments/verify/ \
  -H "Authorization: Bearer GUEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "razorpay_order_id": "order_xyz123",
    "razorpay_payment_id": "pay_xyz123",
    "razorpay_signature": "signature_xyz123"
  }'
```

### Test 8.3: Get Transaction History

**Endpoint:** GET `/api/payments/transactions/`

```bash
curl -X GET http://localhost:8001/api/payments/transactions/ \
  -H "Authorization: Bearer USER_TOKEN"
```

---

## 9️⃣ Admin Dashboard Testing

### Test 9.1: Get Admin Dashboard

**Endpoint:** GET `/api/crm/dashboard/`

```bash
curl -X GET http://localhost:8001/api/crm/dashboard/ \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response:**
```json
{
  "total_users": 15,
  "active_users_this_month": 12,
  "verified_hosts": 8,
  "total_listings": 25,
  "approved_listings": 20,
  "pending_listings": 5,
  "total_bookings": 50,
  "completed_bookings": 40,
  "disputed_bookings": 2,
  "total_revenue": 25000.00,
  "platform_commission": 4500.00,
  "pending_host_payouts": 5000.00
}
```

### Test 9.2: Get Revenue Report

**Endpoint:** GET `/api/crm/revenue-report/`

```bash
curl -X GET "http://localhost:8001/api/crm/revenue-report/?start_date=2026-02-01&end_date=2026-02-28" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 🧪 Frontend Testing Checklist

### User Registration & Authentication
- [ ] Register as a guest user
- [ ] Register as a host user
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Access user profile page
- [ ] Update profile information

### KYC Verification (Host Only)
- [ ] Submit KYC documents
- [ ] Verify documents uploaded
- [ ] Check KYC status in profile

### Listing Management
- [ ] Create a new listing
- [ ] Upload multiple images
- [ ] Set listing as primary image
- [ ] Filter listings by category
- [ ] Filter listings by price range
- [ ] Filter listings by location
- [ ] Search for listings
- [ ] View listing details
- [ ] Edit own listing
- [ ] Delete own listing

### Booking System
- [ ] View available dates for a listing
- [ ] Calculate booking price
- [ ] Create a booking
- [ ] View my bookings (as guest)
- [ ] View incoming bookings (as host)
- [ ] Confirm booking (as host)
- [ ] Cancel booking (as guest)

### Booking Transitions
- [ ] Scan QR code for handover
- [ ] Mark item as in-use
- [ ] Scan QR code for return
- [ ] Mark item as returned
- [ ] View booking completion

### Reviews & Ratings
- [ ] Leave a review after booking
- [ ] Rate the item (1-5 stars)
- [ ] Rate the host/guest
- [ ] View reviews on listing

### Admin Panel
- [ ] View dashboard statistics
- [ ] View pending listings
- [ ] Approve/reject listings
- [ ] View pending KYC documents
- [ ] Approve/reject KYC
- [ ] View disputed bookings
- [ ] Resolve disputes
- [ ] Generate revenue reports

---

## 📝 Common Test Scenarios

### Scenario 1: Full Booking Lifecycle

1. **Register as Host** → Gets KYC verified by admin
2. **Create Listing** → Gets approved by admin
3. **Register as Guest** → KYC verified
4. **Create Booking** → Payment processed
5. **Host Confirms** → Inventory blocked
6. **Handover (QR)** → Item in use
7. **Return (QR)** → Item returned
8. **Complete Booking** → Commission calculated
9. **Leave Review** → Trust score updated

### Scenario 2: Prevent Double Booking

1. Guest A books dates March 1-5
2. Try booking same dates - Should fail with "Dates not available"
3. Try booking overlap dates - Should fail

### Scenario 3: Gold Host Status

1. Host creates 10+ successful bookings
2. Maintains 4.5+ rating
3. System automatically marks as Gold Host
4. Listings show "Gold Host" badge

### Scenario 4: Dispute Resolution

1. Guest raises dispute with reason
2. Admin views dispute details
3. Admin resolves with "refund_full" or "refund_partial"
4. Amount refunded to guest
5. Booking marked as completed

---

## 🐛 Debugging Tips

### Backend Issues

**Check logs:**
```bash
# Watch Django logs
tail -f omnishare_backend/logs/django.log
```

**Database queries:**
```bash
# Access database shell
python manage.py dbshell
```

**Reset database:**
```bash
python manage.py flush
python manage.py migrate
```

### Frontend Issues

**Clear cache:**
```bash
# In browser DevTools Console
localStorage.clear()
sessionStorage.clear()
location.reload()
```

**Check network requests:**
```bash
# Open Network tab in DevTools
# Look for failed requests
# Check response body for error details
```

---

## ✅ Checklist Before Production

- [ ] All migrations applied
- [ ] Admin account created
- [ ] CORS configured for production domain
- [ ] Environment variables set (.env file)
- [ ] Database backed up
- [ ] SSL/TLS certificates configured
- [ ] Razorpay credentials verified
- [ ] Email service configured
- [ ] AWS S3 configured (if using)
- [ ] API rate limiting enabled
- [ ] Logging configured
- [ ] Monitoring set up
