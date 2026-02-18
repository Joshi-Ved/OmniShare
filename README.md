# OmniShare - P2P Rental Marketplace

A comprehensive peer-to-peer rental marketplace platform built with Django REST Framework and React. OmniShare enables users to rent out and borrow items with secure booking management, real-time inventory tracking, and integrated payment processing.

## 🚀 Features

### Experiments 3 & 4 - Implemented Features

#### User Management
- **Custom User Model** with role-based permissions (Guest, Host, Both)
- **KYC Verification** workflow (Document upload → Admin verification)
- **Trust Score System** (0-5 rating based on booking history)  
- **Gold Host Program** (10+ bookings, 4.5+ rating)
- **JWT Authentication** with token refresh (5hr access, 7-day refresh)

#### Listing Management
- **CRUD Operations** for rental listings
- **Category System** with icons
- **Image Uploads** (multiple photos per listing)
- **Admin Verification** workflow (pending → approved/rejected)
- **Advanced Filtering** (category, price, location, Gold Host, rating)
- **Promoted Listings** feature

#### Booking System
- **7-State Booking Lifecycle**:
  - `pending` → `confirmed` → `in_use` → `returned` → `completed`
  - Dispute path: `disputed` → `completed`
  - Cancel option: `cancelled`
- **Inventory Blocking** prevents double-booking
- **Race Condition Prevention** with atomic transactions
- **QR Code Generation** for handover/return verification
- **Date Availability Checker** 
- **Price Calculator** with commission breakdown

#### Payment Integration
- **Razorpay Payment Gateway** integration
- **Commission System**: 18% total (12% from host, 6% from guest)
- **Transaction Tracking** with payment verification
- **Deposit Management**

#### Admin Controls
- **Dashboard Analytics** (users, listings, bookings, revenue)
- **Listing Verification Panel**
- **KYC Approval System**
- **Dispute Resolution** with refund options
- **Revenue Reporting**

#### Additional Features
- **CRM Analytics** dashboard
- **Lead Capture** system
- **Referral Program** with unique codes
- **Review & Rating System**
- **Trust Score** auto-calculation

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

### Frontend
- **React 18** - UI library
- **React Router v6** - Navigation
- **Axios** - HTTP client with interceptors
- **React Toastify** - Notifications
- **QRCode.React** - QR display

---

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 13+
- Git

---

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Joshi-Ved/OmniShare.git
cd OmniShare
```

### 2. Backend Setup

```bash
cd omnishare_backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r ../requirements.txt
```

### 3. Database Configuration

Create PostgreSQL database:
```bash
psql -U postgres
CREATE DATABASE omnishare_db;
\q
```

Create `.env` file in `omnishare_backend/`:
```env
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_NAME=omnishare_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_HOST=localhost
DATABASE_PORT=5432

RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### 4. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Create Superuser

```bash
python manage.py createsuperuser
```

### 6. Load Sample Categories (Optional)

```bash
python manage.py shell
```

```python
from listings.models import Category

categories = [
    {'name': 'Cameras & Photography', 'icon': 'camera'},
    {'name': 'Power Tools', 'icon': 'tool'},
    {'name': 'Sports Equipment', 'icon': 'sports'},
    {'name': 'Musical Instruments', 'icon': 'music'},
    {'name': 'Party & Events', 'icon': 'party'},
    {'name': 'Travel Gear', 'icon': 'luggage'},
]

for cat in categories:
    Category.objects.get_or_create(name=cat['name'], defaults={'icon': cat['icon']})

exit()
```

### 7. Frontend Setup

```bash
cd ../omnishare_frontend

# Install dependencies
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:8000/api" > .env
```

---

## 🚀 Running the Application

### Start Backend Server

```bash
cd omnishare_backend
python manage.py runserver
```

Backend runs on: **http://localhost:8000**  
Django Admin: **http://localhost:8000/admin**

### Start Frontend Server

```bash
cd omnishare_frontend
npm start
```

Frontend runs on: **http://localhost:3000**

---

## 📚 API Documentation

Comprehensive API documentation available in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### Quick API Reference

**Authentication:**
- POST `/api/users/register/` - User registration
- POST `/api/users/login/` - Login with JWT
- POST `/api/users/token/refresh/` - Refresh access token

**Listings:**
- GET `/api/listings/` - Browse listings with filters
- GET `/api/listings/{id}/` - Get listing details
- POST `/api/listings/create/` - Create listing (host only)

**Bookings:**
- POST `/api/bookings/calculate-price/` - Calculate booking price
- POST `/api/bookings/create/` - Create booking
- GET `/api/bookings/my-bookings/?role=guest` - Get my bookings

**Admin:**
- GET `/api/crm/dashboard/` - Platform analytics
- POST `/api/listings/verify/` - Verify listings
- POST `/api/bookings/resolve-dispute/` - Resolve disputes

---

## 🧪 Testing

See detailed testing guide in [TESTING_DEPLOYMENT_GUIDE.md](./TESTING_DEPLOYMENT_GUIDE.md)

### Quick Test Flow

1. **Register as Guest** → Submit KYC → Admin approves
2. **Register as Host** → Submit KYC → Admin approves → Create listing
3. **Admin** → Approve listing
4. **Guest** → Browse → Select dates → Calculate price → Create booking
5. **Host** → Confirm booking
6. **Handover** → Scan QR → Status: "in_use"
7. **Return** → Scan QR → Status: "returned"
8. **Complete** → Release funds → Status: "completed"

---

## 🏗️ Project Structure

```
OmniShare/
├── omnishare_backend/
│   ├── omnishare/              # Django project settings
│   ├── users/                  # User management & KYC
│   ├── listings/               # Listing CRUD & verification
│   ├── bookings/               # Booking state machine
│   ├── payments/               # Razorpay integration
│   ├── crm/                    # Analytics & dashboard
│   ├── marketing/              # Leads & referrals
│   └── manage.py
├── omnishare_frontend/
│   ├── src/
│   │   ├── components/         # Navbar, PrivateRoute
│   │   ├── pages/              # All page components
│   │   └── services/           # API client
│   └── package.json
├── requirements.txt            # Python dependencies
├── API_DOCUMENTATION.md        # Complete API reference
├── TESTING_DEPLOYMENT_GUIDE.md # Deployment instructions
└── README.md                   # This file
```

---

## 📊 Database Schema

### Key Models

**User**
- Custom user with `role` (guest/host/both)
- KYC status tracking
- Trust score (0-5)
- Gold Host flag

**Listing**
- Belongs to Host
- Verification status
- Daily price & deposit
- Availability dates

**Booking**
- Links Guest, Host, Listing
- 7 status states
- Commission tracking
- QR codes for verification

**Transaction**
- Payment tracking
- Razorpay integration
- Status monitoring

---

## 🔐 Security Features

- JWT token authentication with auto-refresh
- Role-based access control (RBAC)
- KYC verification requirement
- Admin approval workflows
- QR code verification for handover/return
- Payment signature verification
- CORS configuration
- Secure password hashing

---

## 💰 Commission Model

**Total Platform Commission: 18%**

- **Host pays**: 12% of rental amount
- **Guest pays**: 6% on top of rental amount

**Example Calculation:**
```
Rental Amount: ₹6,000 (4 days × ₹1,500)
Host Commission (12%): ₹720
Guest Commission (6%): ₹360
Platform Total: ₹1,080

Host Receives: ₹5,280
Guest Pays: ₹6,360 + deposit + insurance
```

---

## 🚀 Deployment

See [TESTING_DEPLOYMENT_GUIDE.md](./TESTING_DEPLOYMENT_GUIDE.md) for:
- AWS EC2 deployment
- PostgreSQL setup
- Nginx configuration
- SSL certificate setup
- S3 media storage
- Production checklist

---

## 📝 License

This project is part of the OmniShare platform development experiments.

---

## 👥 Contributors

- Ved Joshi ([@Joshi-Ved](https://github.com/Joshi-Ved))

---

## 🆘 Support

For issues and questions:
- **GitHub Issues**: [Create an issue](https://github.com/Joshi-Ved/OmniShare/issues)
- **Documentation**: See API_DOCUMENTATION.md
- **Deployment Help**: See TESTING_DEPLOYMENT_GUIDE.md

---

## 🗺️ Roadmap

**Completed (Experiments 3 & 4)**:
- ✅ User authentication & KYC
- ✅ Listing management
- ✅ Booking system with state machine
- ✅ Payment integration
- ✅ Admin dashboard
- ✅ Commission tracking

**Future Experiments**:
- Experiment 5: Host Rewards
- Experiment 6: Advanced UI
- Experiment 7: Notifications
- Experiment 8: Analytics
- Experiment 9: Production Deployment
- Experiment 10: Scale Testing

---

**Built with ❤️ using Django & React**
