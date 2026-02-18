# OmniShare API Documentation

## Base URL
```
Development: http://localhost:8000/api
Production: https://your-domain.com/api
```

## Authentication
All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Authentication APIs

### 1. User Registration
**POST** `/users/register/`

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "password2": "SecurePass123",
  "phone_number": "+919876543210",
  "role": "guest"  // "guest", "host", or "both"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "guest",
    "kyc_status": "not_submitted",
    "trust_score": 5.0
  },
  "tokens": {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  },
  "message": "User registered successfully"
}
```

### 2. User Login
**POST** `/users/login/`

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### 3. Token Refresh
**POST** `/users/token/refresh/`

**Request Body:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### 4. Get User Profile
**GET** `/users/profile/`
*Requires Authentication*

**Response:**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "phone_number": "+919876543210",
  "role": "guest",
  "kyc_status": "verified",
  "trust_score": 4.8,
  "total_bookings": 5,
  "successful_bookings": 4,
  "gold_host_flag": false,
  "can_create_listing": true,
  "can_book": true
}
```

### 5. Submit KYC
**POST** `/users/kyc/submit/`
*Requires Authentication*

**Request Body (multipart/form-data):**
```
kyc_document: <file>
```

---

## Listing APIs

### 1. Get All Listings
**GET** `/listings/`

**Query Parameters:**
- `category`: Category slug
- `location`: Location search
- `min_price`: Minimum daily price
- `max_price`: Maximum daily price
- `min_rating`: Minimum rating
- `gold_host`: "true" to filter Gold Hosts only
- `search`: Search in title and description

**Response:**
```json
{
  "count": 50,
  "next": "http://localhost:8000/api/listings/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "host": {
        "id": 2,
        "username": "host_user",
        "trust_score": 4.9,
        "gold_host_flag": true,
        "successful_bookings": 25
      },
      "title": "Canon EOS 5D Mark IV",
      "description": "Professional DSLR camera...",
      "category": 1,
      "category_name": "Cameras",
      "daily_price": "1500.00",
      "deposit": "15000.00",
      "location": "Mumbai, Andheri",
      "rating": "4.8",
      "total_reviews": 12,
      "promoted_flag": true,
      "primary_image": "http://localhost:8000/media/...",
      "is_bookable": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 2. Get Listing Details
**GET** `/listings/{id}/`

**Response:**
```json
{
  "id": 1,
  "host": {
    "id": 2,
    "username": "host_user",
    "trust_score": 4.9,
    "gold_host_flag": true,
    "successful_bookings": 25
  },
  "title": "Canon EOS 5D Mark IV",
  "description": "Professional DSLR camera with full accessories...",
  "category": 1,
  "category_name": "Cameras",
  "daily_price": "1500.00",
  "deposit": "15000.00",
  "location": "Mumbai, Andheri",
  "address": "Shop 5, Link Road, Andheri West",
  "latitude": "19.1258",
  "longitude": "72.8479",
  "availability_start": "2024-01-01",
  "availability_end": "2024-12-31",
  "is_available": true,
  "verification_status": "approved",
  "rating": "4.80",
  "total_reviews": 12,
  "total_bookings": 25,
  "promoted_flag": true,
  "images": [
    {
      "id": 1,
      "image": "http://localhost:8000/media/listing_images/camera1.jpg",
      "caption": "Front view",
      "is_primary": true,
      "uploaded_at": "2024-01-15T10:30:00Z"
    }
  ],
  "is_bookable": true,
  "is_owner": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### 3. Create Listing
**POST** `/listings/create/`
*Requires Authentication (Verified Host)*

**Request Body:**
```json
{
  "title": "Canon EOS 5D Mark IV",
  "description": "Professional DSLR camera with full accessories",
  "category": 1,
  "daily_price": "1500.00",
  "deposit": "15000.00",
  "location": "Mumbai, Andheri",
  "address": "Shop 5, Link Road, Andheri West",
  "latitude": "19.1258",
  "longitude": "72.8479",
  "availability_start": "2024-01-01",
  "availability_end": "2024-12-31"
}
```

### 4. Upload Listing Image
**POST** `/listings/{listing_id}/images/`
*Requires Authentication (Listing Owner)*

**Request Body (multipart/form-data):**
```
image: <file>
caption: "Front view"
is_primary: true
```

### 5. Get My Listings
**GET** `/listings/my-listings/`
*Requires Authentication*

### 6. Get Categories
**GET** `/listings/categories/`

---

## Booking APIs

### 1. Calculate Price
**POST** `/bookings/calculate-price/`
*Requires Authentication*

**Request Body:**
```json
{
  "listing_id": 1,
  "start_date": "2024-02-01",
  "end_date": "2024-02-05"
}
```

**Response:**
```json
{
  "rental_days": 4,
  "daily_price": 1500.0,
  "rental_amount": 6000.0,
  "commission_guest": 360.0,
  "deposit": 15000.0,
  "insurance_fee": 300.0,
  "guest_total": 21660.0,
  "host_payout": 5280.0,
  "platform_commission": 1080.0
}
```

### 2. Create Booking
**POST** `/bookings/create/`
*Requires Authentication (Verified Guest)*

**Request Body:**
```json
{
  "listing": 1,
  "start_date": "2024-02-01",
  "end_date": "2024-02-05",
  "insurance_fee": 300.0
}
```

**Response:**
```json
{
  "message": "Booking created successfully",
  "booking": {
    "id": 1,
    "listing": 1,
    "listing_title": "Canon EOS 5D Mark IV",
    "guest": 1,
    "host": 2,
    "start_date": "2024-02-01",
    "end_date": "2024-02-05",
    "rental_days": 4,
    "guest_total": "21660.00",
    "host_payout": "5280.00",
    "booking_status": "pending",
    "qr_code": "http://localhost:8000/media/qr_codes/booking_1.png"
  }
}
```

### 3. Get My Bookings
**GET** `/bookings/my-bookings/?role=guest`
*Requires Authentication*

**Query Parameters:**
- `role`: "guest" or "host"

### 4. Confirm Booking
**POST** `/bookings/{booking_id}/confirm/`
*Requires Authentication (Host)*

### 5. Handover (Scan QR)
**POST** `/bookings/handover/`
*Requires Authentication (Host)*

**Request Body:**
```json
{
  "booking_id": 1,
  "qr_token": "abc123-def456-ghi789"
}
```

### 6. Return (Scan QR)
**POST** `/bookings/return/`
*Requires Authentication (Host)*

**Request Body:**
```json
{
  "booking_id": 1,
  "qr_token": "abc123-def456-ghi789"
}
```

### 7. Complete Booking
**POST** `/bookings/{booking_id}/complete/`
*Requires Authentication (Host)*

### 8. Raise Dispute
**POST** `/bookings/raise-dispute/`
*Requires Authentication*

**Request Body:**
```json
{
  "booking_id": 1,
  "reason": "Item was damaged"
}
```

### 9. Cancel Booking
**POST** `/bookings/cancel/`
*Requires Authentication*

**Request Body:**
```json
{
  "booking_id": 1,
  "reason": "Change of plans"
}
```

### 10. Get Blocked Dates
**GET** `/bookings/blocked-dates/{listing_id}/`
*Requires Authentication*

**Response:**
```json
{
  "listing_id": 1,
  "blocked_dates": [
    "2024-02-01",
    "2024-02-02",
    "2024-02-03",
    "2024-02-04",
    "2024-02-05"
  ]
}
```

---

## Payment APIs

### 1. Create Razorpay Order
**POST** `/payments/create-order/{booking_id}/`
*Requires Authentication*

**Response:**
```json
{
  "order_id": "order_JKsdfJ34sdfsdf",
  "amount": 2166000,
  "currency": "INR",
  "razorpay_key": "rzp_test_xxxxx"
}
```

### 2. Verify Payment
**POST** `/payments/verify/`
*Requires Authentication*

**Request Body:**
```json
{
  "razorpay_order_id": "order_JKsdfJ34sdfsdf",
  "razorpay_payment_id": "pay_JKsdfJ34sdfsdf",
  "razorpay_signature": "abc123...",
  "booking_id": 1
}
```

**Response:**
```json
{
  "message": "Payment verified and booking confirmed",
  "transaction_id": 1,
  "booking_status": "confirmed"
}
```

### 3. Get Transaction History
**GET** `/payments/transactions/`
*Requires Authentication*

---

## Admin APIs

### 1. Dashboard Analytics
**GET** `/crm/dashboard/`
*Requires Admin Authentication*

**Response:**
```json
{
  "users": {
    "total": 150,
    "verified": 120,
    "gold_hosts": 15
  },
  "listings": {
    "total": 200,
    "verified": 180,
    "pending": 20
  },
  "bookings": {
    "total": 350,
    "completed": 300,
    "active": 30,
    "disputed": 5
  },
  "revenue": {
    "total_platform_revenue": 125000.0,
    "monthly_gmv": 750000.0
  },
  "top_hosts": [...]
}
```

### 2. Verify Listing
**POST** `/listings/verify/`
*Requires Admin Authentication*

**Request Body:**
```json
{
  "listing_id": 1,
  "status": "approved",
  "remarks": "All good"
}
```

### 3. Get Pending Listings
**GET** `/listings/pending/`
*Requires Admin Authentication*

### 4. Verify KYC
**POST** `/users/kyc/verify/`
*Requires Admin Authentication*

**Request Body:**
```json
{
  "user_id": 1,
  "status": "verified",
  "remarks": "Documents verified"
}
```

### 5. Get Pending KYC
**GET** `/users/kyc/pending/`
*Requires Admin Authentication*

### 6. Get Disputed Bookings
**GET** `/bookings/disputed/`
*Requires Admin Authentication*

### 7. Resolve Dispute
**POST** `/bookings/resolve-dispute/`
*Requires Admin Authentication*

**Request Body:**
```json
{
  "booking_id": 1,
  "resolution": "Item was indeed damaged. Refunding guest.",
  "refund_to_guest": true
}
```

---

## Marketing APIs

### 1. Capture Lead
**POST** `/marketing/leads/capture/`
*Public endpoint*

**Request Body:**
```json
{
  "email": "potential@customer.com",
  "name": "John Doe",
  "phone": "+919876543210",
  "source": "landing_page",
  "interested_in": "both"
}
```

### 2. Get Referral Code
**GET** `/marketing/referral-code/`
*Requires Authentication*

**Response:**
```json
{
  "code": "ABC12XYZ",
  "uses": 5,
  "referral_link": "https://omnishare.com/signup?ref=ABC12XYZ"
}
```

---

## Error Responses

All endpoints return standard error responses:

**400 Bad Request:**
```json
{
  "error": "Validation error message",
  "field_name": ["Specific field error"]
}
```

**401 Unauthorized:**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

**403 Forbidden:**
```json
{
  "detail": "You do not have permission to perform this action."
}
```

**404 Not Found:**
```json
{
  "detail": "Not found."
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error message"
}
```

---

## Booking Status Flow

```
pending → confirmed → in_use → returned → completed
                    ↓
                disputed → completed
                    ↓
                cancelled
```

## Commission Calculation

- **Host Commission**: 12% deducted from rental amount
- **Guest Commission**: 6% added to guest payment
- **Total Platform Commission**: 18%

**Example:**
- Rental Amount: ₹6,000
- Host Commission (12%): ₹720
- Guest Commission (6%): ₹360
- Platform Total: ₹1,080
- Host Receives: ₹5,280
- Guest Pays: ₹6,360 (+ deposit + insurance)
