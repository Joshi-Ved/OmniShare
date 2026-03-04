# Experiment 3: Design and Development of an E-Commerce Website
## OmniShare – P2P Rental Marketplace

---

## Aim

Design and development of an e-commerce website for a selected product/service.
**Selected Service:** Peer-to-Peer (P2P) Item Rental Marketplace – *OmniShare*

---

## Theory

### 1. Introduction to E-Commerce

Electronic Commerce (E-Commerce) refers to the buying and selling of goods and services over the internet. It enables businesses to reach a global audience, operate 24/7, and reduce operational costs compared to traditional retail models. Popular examples of e-commerce platforms include Amazon, Flipkart, and Shopify.

An e-commerce website acts as a digital storefront where customers can browse products/services, add items to a cart, make secure payments, and track orders online.

**OmniShare** is a service-based e-commerce platform that operates as a Peer-to-Peer (P2P) rental marketplace. Instead of selling physical products, it facilitates the renting and borrowing of items between users. Owners (hosts) list items for rent, and borrowers (guests) book those items for a specified duration. The platform handles the entire transaction lifecycle — from listing discovery and secure booking to payment processing and dispute resolution — available 24/7 over the internet.

---

### 2. Objectives of the E-Commerce Website

The main objectives of designing and developing OmniShare are:

- To provide an online platform for renting and borrowing items/services (P2P model)
- To ensure secure and seamless online rental transactions using Razorpay payment gateway
- To enhance customer convenience through real-time availability, booking management, and order tracking
- To manage inventory, bookings, commissions, and user data efficiently via a structured backend
- To expand reach beyond geographical limitations by enabling any verified user to list or rent items
- To build trust between strangers through a KYC (Know Your Customer) verification system and ratings

---

### 3. Types of E-Commerce Models

Depending on the nature of transactions, e-commerce websites can follow different models:

| Model | Description | Example |
|-------|-------------|---------|
| **B2C** (Business to Consumer) | Businesses sell directly to customers | Amazon, Flipkart |
| **B2B** (Business to Business) | Transactions between businesses | Alibaba |
| **C2C** (Consumer to Consumer) | Individuals sell/rent to other individuals | eBay, OLX |
| **C2B** (Consumer to Business) | Individuals offer products/services to businesses | Freelancing platforms |

**OmniShare follows the C2C (Consumer to Consumer) model**, where individual users act as both hosts (suppliers) and guests (consumers). Hosts list their personal items for rent, and guests book and pay for those rentals directly through the platform. OmniShare earns revenue by collecting an 18% commission (12% from host + 6% added to guest total) on each successful transaction.

---

### 4. System Architecture of OmniShare

OmniShare follows a standard **three-tier architecture**:

```
┌─────────────────────────────────────────────────────┐
│              PRESENTATION LAYER (Frontend)           │
│         React 18 + React Router + Axios             │
│   Home | Listings | Booking | Dashboards | Auth     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST API (JSON)
┌──────────────────────▼──────────────────────────────┐
│             APPLICATION LAYER (Backend)              │
│    Django 4.2 + Django REST Framework (Python)      │
│  users | listings | bookings | payments | crm       │
└──────────────────────┬──────────────────────────────┘
                       │ ORM (Django Models)
┌──────────────────────▼──────────────────────────────┐
│                  DATABASE LAYER                      │
│      SQLite (Development) / PostgreSQL (Prod)       │
│  Users | Listings | Bookings | Payments | KYC       │
└─────────────────────────────────────────────────────┘
```

#### a) Presentation Layer (Frontend)

The frontend of OmniShare is built with modern JavaScript technologies:

- **Framework:** React 18 with JSX
- **Routing:** React Router v6 (`BrowserRouter`, `Routes`, `Route`)
- **HTTP Client:** Axios for REST API calls
- **Notifications:** React Toastify
- **Authentication UI:** Firebase Authentication (Google / Email)

**Frontend Pages:**

| Page | Purpose |
|------|---------|
| `Home.jsx` | Browse and filter available listings |
| `Login.jsx` / `Register.jsx` | User authentication |
| `ListingDetails.jsx` | View item details, pricing, and availability |
| `BookingPage.jsx` | Book an item and initiate payment |
| `CreateListing.jsx` | Hosts create/edit their rental listings |
| `HostDashboard.jsx` | Manage outgoing bookings and earnings |
| `GuestDashboard.jsx` | Track active and past bookings |
| `AdminDashboard.jsx` | Platform-wide analytics and moderation |
| `KYCSubmission.jsx` | Identity verification for users |

**Reusable Components:**
- `Navbar.jsx` – Navigation bar with auth state awareness
- `PrivateRoute.jsx` – Route guard for authenticated/admin-only pages

#### b) Application Layer (Backend)

The backend implements all business logic using Django REST Framework:

- **Framework:** Django 4.2 + Django REST Framework
- **Language:** Python 3.8+
- **Authentication:** Firebase Authentication + Custom `FirebaseAuthentication` class
- **Modules:**

| App | Responsibility |
|-----|---------------|
| `users` | Registration, login, KYC submission and verification |
| `listings` | CRUD for rental listings, image uploads, verification |
| `bookings` | Booking lifecycle (state machine), dispute resolution |
| `payments` | Razorpay order creation, payment verification, transaction history |
| `crm` | Admin analytics dashboard, revenue reports |
| `marketing` | Leads management, referral tracking |

- **CORS** is enabled for frontend-backend communication (`corsheaders`)
- **Pagination** is applied to all list endpoints (20 items per page)
- **Search & Ordering** filters are available via DRF filter backends

#### c) Database Layer

OmniShare stores all persistent data in a relational database:

- **Development:** SQLite (`db.sqlite3`)
- **Production (recommended):** PostgreSQL

**Key Database Models (15+ tables):**

| Model | Key Fields |
|-------|-----------|
| `User` | email, role (host/guest/admin), kyc_status, firebase_uid |
| `Listing` | title, description, price_per_day, availability, category |
| `Booking` | listing, guest, host, status, start_date, end_date, total_amount |
| `Payment` | booking, razorpay_order_id, razorpay_payment_id, status |
| `KYCDocument` | user, document_type, document_number, verified |
| `BlockedDate` | listing, start_date, end_date (prevents double booking) |

---

### 5. Key Features of OmniShare

| Feature | Implementation |
|---------|---------------|
| **User Registration & Login** | Firebase Authentication + custom user model |
| **KYC Verification** | Document upload and admin approval workflow |
| **Listing Catalog** | Search, filter by category, price range, and availability |
| **Booking System** | State machine (Pending → Confirmed → Active → Completed) |
| **Inventory Blocking** | `BlockedDate` model prevents double-booking |
| **Secure Payment Gateway** | Razorpay integration (UPI, Cards, Net Banking, Wallets) |
| **Commission Tracking** | 12% from host + 6% from guest = 18% platform commission |
| **Dispute Resolution** | Guests/hosts can raise disputes; admin resolves them |
| **Admin Panel** | Revenue reports, KYC approvals, dispute management |
| **QR Code Handover** | QR-based pickup and return verification |
| **Responsive Design** | Mobile-compatible via React's component-based UI |
| **Order/Booking Tracking** | Real-time booking status via dashboard |

---

### 6. Payment Gateway Integration

A payment gateway enables secure online transactions. OmniShare integrates **Razorpay**, a leading Indian payment service provider.

**How Payment Works in OmniShare:**

```
Guest confirms booking
       ↓
Backend creates Razorpay Order (amount in paise)
       ↓
Frontend opens Razorpay Checkout (Cards / UPI / Wallets / Net Banking)
       ↓
Guest completes payment
       ↓
Backend verifies HMAC-SHA256 signature
       ↓
Booking status updated → Payment record saved
```

**Razorpay Integration Code (Backend):**
```python
# razorpay_utils.py
import razorpay

def create_razorpay_order(booking):
    client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    amount = int(float(booking.guest_total) * 100)  # Convert to paise
    order = client.order.create({'amount': amount, 'currency': 'INR'})
    return order

def verify_payment_signature(order_id, payment_id, signature):
    client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    client.utility.verify_payment_signature({
        'razorpay_order_id': order_id,
        'razorpay_payment_id': payment_id,
        'razorpay_signature': signature
    })
```

**Commission Model:**
```
Guest Total = Base Rent + 6% Guest Fee
Host Payout = Base Rent - 12% Host Commission
Platform Revenue = 18% of Base Rent
```

**Security Measures:**
- HMAC-SHA256 signature verification for every payment
- SSL/HTTPS enforced in production (`SECURE_SSL_REDIRECT = True`)
- Razorpay webhook support for async payment confirmation

---

### 7. Security Considerations

Security is a critical aspect of OmniShare's development:

| Security Measure | Implementation in OmniShare |
|-----------------|----------------------------|
| **SSL Encryption** | `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` enabled in production |
| **Authentication** | Firebase Authentication (OAuth2) + custom `FirebaseAuthentication` DRF backend |
| **Authorization** | Role-based access control (guest / host / admin) via `permissions.py` |
| **KYC Verification** | Identity documents verified before users can list items or book |
| **Password Policy** | Django's built-in validators (length, common passwords, numeric-only) |
| **SQL Injection Prevention** | Django ORM parameterized queries (no raw SQL) |
| **XSS Prevention** | `SECURE_BROWSER_XSS_FILTER`, `SECURE_CONTENT_TYPE_NOSNIFF` |
| **Clickjacking Protection** | `X_FRAME_OPTIONS = 'DENY'` |
| **CORS Policy** | Restricted to known frontend origins only |
| **Payment Security** | Razorpay HMAC-SHA256 signature verification |

---

### 8. Development Methodology

OmniShare was built using an **iterative/Agile methodology**, broken into numbered experiments:

| Phase | Activity | OmniShare Implementation |
|-------|----------|--------------------------|
| **1. Requirement Analysis** | Define features, user stories | Identified host/guest/admin roles, booking flow, payment needs |
| **2. System Design** | UI/UX wireframing, DB schema, API design | Designed 15+ DB models, 40+ API endpoints, React page structure |
| **3. Implementation** | Coding frontend and backend | Django REST Framework backend + React 18 frontend |
| **4. Testing** | Unit, integration, and API testing | 50+ test cases with cURL examples; DRF test client used |
| **5. Deployment** | Production setup guide | Gunicorn + Nginx + PostgreSQL deployment documented |
| **6. Maintenance** | Updates, enhancements | Planned features: push notifications, mobile app, ML recommendations |

**Experiments completed:**
- Experiment 3: Core platform (listings, bookings, users)
- Experiment 4: Admin dashboard, dispute resolution
- Experiment 5: Payment integration (Razorpay), host rewards

---

### 9. Advantages of OmniShare (E-Commerce Website)

| Advantage | How OmniShare Achieves It |
|-----------|--------------------------|
| **Global/Wide Market Reach** | Any verified user in the network can list or rent items online |
| **Lower Operational Costs** | No physical storefront; platform is entirely digital |
| **24/7 Availability** | React frontend + Django backend always running; items bookable anytime |
| **Easy Comparison** | Guests can browse, filter by category/price, and compare listings |
| **Improved Customer Experience** | Real-time booking status, QR handover, dashboard tracking, notifications |
| **Trust & Safety** | KYC verification and rating system build trust between strangers |
| **Efficient Inventory Management** | Blocked dates prevent double booking; host controls availability |
| **Scalable Revenue Model** | 18% commission scales automatically with transaction volume |

---

### 10. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router v6, Axios, React Toastify |
| **Backend** | Python 3.8+, Django 4.2, Django REST Framework |
| **Database** | SQLite (dev), PostgreSQL (production) |
| **Authentication** | Firebase Authentication, Custom DRF `FirebaseAuthentication` |
| **Payment Gateway** | Razorpay (UPI, Cards, Net Banking, Wallets) |
| **File Storage** | Local media (dev), AWS S3 (production) |
| **API Style** | RESTful JSON API (40+ endpoints) |
| **Server** | Gunicorn + Nginx (production deployment) |
| **Security** | HTTPS/SSL, CORS, CSRF, XSS protection |

---

## Conclusion

The design and development of OmniShare demonstrates a complete, production-ready e-commerce platform for a service-based business — peer-to-peer item rental. By following a three-tier architecture (React frontend, Django REST Framework backend, and relational database), the platform successfully handles all critical e-commerce functions: user authentication and KYC, listing management with inventory control, a multi-stage booking state machine, secure Razorpay payment processing, and a comprehensive admin panel.

Key engineering achievements include:
- **40+ REST API endpoints** serving all platform operations
- **15+ database models** covering users, listings, bookings, payments, and KYC
- **18% commission model** automatically calculated and tracked per transaction
- **Double-booking prevention** via date-blocking at the database level
- **Production-grade security** with Firebase Auth, HMAC payment verification, and Django security middleware

OmniShare successfully demonstrates that modern web technologies — when combined with a well-designed system architecture, a secure payment gateway, and a thoughtful user experience — can power a scalable, feature-rich e-commerce marketplace. The platform is fully operational and ready for real-world deployment.

---

**Project Name:** OmniShare – P2P Rental Marketplace  
**Tech Stack:** Django REST Framework + React 18  
**Database:** SQLite (dev) / PostgreSQL (prod)  
**Payment Gateway:** Razorpay  
**Experiment:** 3  
**Status:** Complete & Production Ready
