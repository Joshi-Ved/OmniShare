# OmniShare - P2P Rental Marketplace

A comprehensive peer-to-peer rental marketplace platform built with Django REST Framework and React. OmniShare enables users to rent out and borrow items with secure booking management, real-time inventory tracking, and integrated payment processing.

![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.8+-green)
![Django](https://img.shields.io/badge/django-4.2.7-darkgreen)
![React](https://img.shields.io/badge/react-18-blue)

---

## 🚀 Key Features

### Core Features ✅
- **Custom User Model** with role-based permissions (Guest, Host, Both)
- **JWT Authentication** with token refresh (5hr access, 7-day refresh)
- **KYC Verification** workflow with document upload and admin verification
- **Listing Management** with CRUD operations, categories, and image uploads
- **Booking System** with 7-state lifecycle and inventory blocking
- **Commission Calculation** (18% total: 12% host + 6% guest)
- **Razorpay Payment Gateway** integration with escrow management
- **QR Code Verification** for secure handover/return
- **Dispute Resolution** with admin panel and refund options
- **Trust Score System** auto-calculated from booking history
- **Gold Host Program** (10+ bookings, 4.5+ rating)

### Advanced Features ✅
- **Atomic Transactions** to prevent race conditions
- **Inventory Blocking** prevents double-booking
- **Admin Dashboard** with analytics and revenue reporting
- **Review & Rating System** with automatic scoring
- **Referral Program** with unique codes
- **Lead Capture** for marketing
- **Advanced Filtering** (category, price, location, gold host)
- **Email Notifications** (booking confirmation, disputes, etc.)
- **Promoted Listings** feature for hosts

---

## 🛠️ Tech Stack

### Backend
- **Django 4.2.7** - Web framework
- **Django REST Framework** - API development
- **PostgreSQL** - Database
- **SimpleJWT** - JWT authentication
- **Razorpay** - Payment gateway
- **Pillow** - Image processing
- **qrcode** - QR code generation
- **Gunicorn** - WSGI server

### Frontend
- **React 18** - UI library
- **React Router v6** - Navigation
- **Axios** - HTTP client
- **React Toastify** - Notifications
- **QRCode.React** - QR display
- **date-fns** - Date utilities

---

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 13+ (or SQLite for development)
- Git

---

## 🔧 Quick Start

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd OmniShare
```

### 2. Backend Setup

```bash
cd omnishare_backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_ENGINE=django.db.backends.sqlite3
DATABASE_NAME=db.sqlite3
ALLOWED_HOSTS=*
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
EOF

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start backend
python manage.py runserver 127.0.0.1:8001
```

### 3. Frontend Setup

```bash
cd omnishare_frontend

# Install dependencies
npm install

# Create .env file (optional)
cat > .env << EOF
REACT_APP_API_URL=http://localhost:8001/api
EOF

# Start frontend
npm start
```

Frontend will open at `http://localhost:3000` (or next available port)

---

## 📚 Documentation

### Available Guides
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API endpoints reference
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Testing procedures with cURL examples
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Architecture and implementation details
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[TESTING_DEPLOYMENT_GUIDE.md](TESTING_DEPLOYMENT_GUIDE.md)** - Testing deployment guide

---

## 🧪 Testing

### Quick Test Scenarios

#### 1. Register & Login
```bash
# Register as host
curl -X POST http://localhost:8001/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testhost",
    "email": "host@test.com",
    "password": "TestPass123",
    "password2": "TestPass123",
    "phone_number": "+919876543210",
    "role": "host"
  }'

# Login
curl -X POST http://localhost:8001/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testhost",
    "password": "TestPass123"
  }'
```

#### 2. Create Listing
```bash
curl -X POST http://localhost:8001/api/listings/create/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mountain Bike",
    "description": "Professional mountain bike",
    "category": 1,
    "location": "Bangalore",
    "daily_price": "500.00",
    "deposit_required": "2000.00"
  }'
```

#### 3. Create Booking
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

For comprehensive testing guide, see [TESTING_GUIDE.md](TESTING_GUIDE.md)

---

## 📊 Booking State Machine

```
pending (Initial)
  ├─→ confirmed (Host confirms)
  │    ├─→ in_use (QR Handover)
  │    │    ├─→ returned (QR Return)
  │    │    │    └─→ completed (Auto-complete)
  │    │    └─→ disputed (Guest raises issue)
  │    │         └─→ completed (Admin resolves)
  │    └─→ cancelled (Before start)
  └─→ disputed (Guest raises issue immediately)
       └─→ completed (Admin resolves)
```

---

## 💰 Commission Structure

```
Rental Amount = Daily Price × Days

Commission Host = 12% of Rental Amount
Commission Guest = 6% added to guest price
Platform Commission = 18% total

Guest Total = Rental Amount + Commission Guest + Deposit + Insurance
Host Payout = Rental Amount - Commission Host
```

**Example:**
- Daily Price: ₹500
- Rental Days: 5
- Rental Amount: ₹2,500

- Commission Host: ₹300 (12%)
- Commission Guest: ₹150 (6%)
- Platform Commission: ₹450 (18%)
- Host Payout: ₹2,200
- Guest Total: ₹2,650 (incl. deposit & insurance)

---

## 🔐 Authentication

### JWT Tokens

All authenticated endpoints require:

```
Authorization: Bearer <access_token>
```

**Token Lifetime:**
- Access Token: 5 hours
- Refresh Token: 7 days

### Role-Based Access

| Role | Can | Cannot |
|------|-----|---------|
| Guest | Book items, leave reviews, raise disputes | Create listings |
| Host | Create listings, confirm bookings, manage inventory | Book items |
| Both | Do everything | - |

**KYC Required:** Both guests and hosts must complete KYC verification for sensitive operations.

---

## 🎯 Preventing Double Booking

OmniShare uses **atomic database transactions** and **select_for_update()** to prevent race conditions:

```python
with transaction.atomic():
    # Lock the booking for this listing during dates
    conflicting = Booking.objects.select_for_update().filter(
        listing=listing,
        booking_status__in=['confirmed', 'in_use', 'returned'],
        start_date__lt=end_date,
        end_date__gt=start_date
    ).exists()
    
    if conflicting:
        raise ValueError("Dates not available")
```

---

## 📱 Frontend Pages

| Page | Description |
|------|-------------|
| **Home** | Browse and filter listings |
| **CreateListing** | Create/edit rental listing |
| **ListingDetails** | View detailed listing info + reviews |
| **BookingPage** | Create new booking |
| **Dashboard** | User profile & settings |
| **HostDashboard** | Manage bookings (as host) |
| **GuestDashboard** | My bookings (as guest) |
| **AdminDashboard** | Listings, KYC, disputes, revenue |

---

## 🛡️ Security Features

- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control (RBAC)
- ✅ CORS configuration
- ✅ Atomic transactions to prevent race conditions
- ✅ Password hashing with Django's default
- ✅ KYC verification workflow
- ✅ Admin audit trail
- ✅ Secure payment with Razorpay

---

## 🚀 Deployment

### Quick Deployment (Ubuntu)

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for full instructions.

**Minimum requirements:**
- Gunicorn for backend
- Nginx as reverse proxy
- PostgreSQL database
- SSL certificate (Let's Encrypt)

---

## 📞 API Endpoints Summary

### Authentication
```
POST   /api/users/register/           - Register user
POST   /api/users/login/              - Login
POST   /api/users/token/refresh/      - Refresh token
GET    /api/users/profile/            - Get profile
```

### Listings
```
GET    /api/listings/                 - List all listings
POST   /api/listings/create/          - Create listing
GET    /api/listings/{id}/            - Get listing detail
PUT    /api/listings/{id}/update/     - Update listing
POST   /api/listings/{id}/images/     - Upload image
GET    /api/listings/categories/      - Get categories
```

### Bookings
```
POST   /api/bookings/create/          - Create booking
GET    /api/bookings/my-bookings/     - My bookings
POST   /api/bookings/{id}/confirm/    - Confirm booking
POST   /api/bookings/handover/        - Handover (QR)
POST   /api/bookings/return/          - Return (QR)
POST   /api/bookings/raise-dispute/   - Raise dispute
```

### Admin
```
GET    /api/crm/dashboard/            - Admin dashboard
GET    /api/listings/pending/         - Pending listings
POST   /api/listings/verify/          - Verify listing
GET    /api/users/kyc/pending/        - Pending KYC
POST   /api/users/kyc/verify/         - Verify KYC
```

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete reference.

---

## 🧪 Running Tests

```bash
# Backend tests
cd omnishare_backend
python manage.py test

# Frontend tests
cd omnishare_frontend
npm test
```

---

## 📦 Project Structure

```
OmniShare/
├── omnishare_backend/
│   ├── users/              # User management & auth
│   ├── listings/           # Listing management
│   ├── bookings/           # Booking & state machine
│   ├── payments/           # Payment integration
│   ├── crm/                # Admin dashboard
│   ├── marketing/          # Leads & referrals
│   ├── omnishare/          # Settings & urls
│   └── manage.py
│
├── omnishare_frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   └── services/       # API service
│   └── package.json
│
├── API_DOCUMENTATION.md    # API reference
├── TESTING_GUIDE.md        # Testing procedures
├── IMPLEMENTATION_GUIDE.md # Architecture details
├── DEPLOYMENT_GUIDE.md     # Production deployment
└── README.md              # This file
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 🆘 Troubleshooting

### Backend Issues

**Port 8001 already in use:**
```bash
# Find and kill process
lsof -i :8001
kill -9 <PID>
```

**Database migration errors:**
```bash
python manage.py migrate --fake
python manage.py migrate
```

### Frontend Issues

**Module not found errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**CORS errors:**
- Check CORS_ALLOWED_ORIGINS in settings.py
- Check frontend API URL in services/api.js

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for more debugging tips.

---

## 📞 Support & Contact

For issues, questions, or suggestions:
1. Check documentation files
2. Review API_DOCUMENTATION.md
3. Check TESTING_GUIDE.md for common issues
4. Review backend logs: `tail -f omnishare_backend/logs/django.log`

---

## 🎉 Get Started

```bash
# Clone
git clone <repo-url>
cd OmniShare

# Backend
cd omnishare_backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8001

# Frontend (in new terminal)
cd omnishare_frontend
npm install
npm start
```

Visit http://localhost:3000 to get started! 🚀

---

**Made with ❤️ by the OmniShare Team**
