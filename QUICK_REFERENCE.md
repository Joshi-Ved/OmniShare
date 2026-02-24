# OmniShare - Quick Reference Card

## 🚀 Start Application

```bash
# Terminal 1 - Backend
cd omnishare_backend
source venv/bin/activate  # or: venv\Scripts\activate (Windows)
python manage.py runserver 127.0.0.1:8001

# Terminal 2 - Frontend
cd omnishare_frontend
npm start
```

**URLs:**
- Frontend: http://localhost:3000 (or next available)
- Backend API: http://localhost:8001/api
- Admin: http://localhost:8001/admin

---

## 👤 Test Users

### Create Test User via API

```bash
# Register Guest
curl -X POST http://localhost:8001/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "guest1",
    "email": "guest@test.com",
    "password": "Test123456",
    "password2": "Test123456",
    "phone_number": "+919876543210",
    "role": "guest"
  }'

# Register Host
curl -X POST http://localhost:8001/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "host1",
    "email": "host@test.com",
    "password": "Test123456",
    "password2": "Test123456",
    "phone_number": "+919876543211",
    "role": "host"
  }'
```

---

## 🗂️ Key Files

| File | Purpose |
|------|---------|
| `omnishare_backend/omnishare/settings.py` | Django configuration |
| `omnishare_backend/bookings/models.py` | Booking state machine |
| `omnishare_backend/bookings/views.py` | Booking API endpoints |
| `omnishare_backend/users/models.py` | Custom user model |
| `omnishare_frontend/src/services/api.js` | API client config |
| `omnishare_frontend/src/pages/Home.jsx` | Main listing page |

---

## 🔄 Booking Lifecycle

```
1. User creates booking (pending)
   ↓
2. Host confirms booking (confirmed)
   ↓
3. Host scans QR at handover (in_use)
   ↓
4. Guest scans QR at return (returned)
   ↓
5. Booking auto-completes (completed)
   ↓
6. Both can leave reviews
```

---

## 💰 Price Calculation

```
Base Price = Daily Price × Days

Breakdown:
├─ Rental Amount: $100 (base)
├─ Commission Host: $12 (12% of base)
├─ Commission Guest: $6 (6% added)
├─ Deposit: $50 (configurable)
├─ Insurance: $10 (fixed)
└─ Guest Total: $176
  └─ Host Payout: $88
```

---

## 🔧 Database Management

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Access database
python manage.py dbshell

# Reset database
python manage.py flush
python manage.py migrate

# Create sample data
python manage.py shell < create_sample_data.py
```

---

## 🧪 Common API Tests

### 1. Register & Get Token

```bash
RESPONSE=$(curl -s -X POST http://localhost:8001/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123",
    "password2": "TestPass123",
    "phone_number": "+919999999999",
    "role": "guest"
  }')

TOKEN=$(echo $RESPONSE | jq -r '.tokens.access')
echo $TOKEN
```

### 2. Get Profile

```bash
curl -X GET http://localhost:8001/api/users/profile/ \
  -H "Authorization: Bearer $TOKEN"
```

### 3. List Listings

```bash
curl -X GET "http://localhost:8001/api/listings/?category=&location=&min_price=&max_price="
```

### 4. Create Listing (Host Only)

```bash
curl -X POST http://localhost:8001/api/listings/create/ \
  -H "Authorization: Bearer $HOST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bicycle",
    "description": "Mountain bike",
    "category": 1,
    "location": "Bangalore",
    "daily_price": "500.00",
    "deposit_required": "2000.00",
    "is_available": true
  }'
```

### 5. Create Booking

```bash
curl -X POST http://localhost:8001/api/bookings/create/ \
  -H "Authorization: Bearer $GUEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listing_id": 1,
    "start_date": "2026-03-01",
    "end_date": "2026-03-05"
  }'
```

---

## 📊 Admin Dashboard

**Admin URL:** http://localhost:8001/admin

**Admin Permissions:**
- View all users and bookings
- Verify listings
- Verify KYC documents
- Resolve disputes
- Generate revenue reports
- View analytics

---

## 🐛 Debug Checklist

- [ ] Backend running on 8001?
- [ ] Frontend running on 3000/3001?
- [ ] API URL correct in frontend?
- [ ] CORS configured?
- [ ] Database migrated?
- [ ] Tokens valid?
- [ ] User roles correct?
- [ ] Check browser console
- [ ] Check terminal logs

---

## 🔐 Common Auth Issues

**"Invalid token":**
- Token expired (> 5 hours)
- Use refresh endpoint
- Re-login to get new token

**"Permission denied":**
- Check user role
- Check if KYC verified for hosts
- Admin operations need is_staff=True

**"CORS error":**
- Check CORS_ALLOWED_ORIGINS in settings
- Check frontend API URL

---

## 📝 Code Snippets

### Get User Token

```python
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(username='testuser')
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)
```

### Check Booking State

```python
from bookings.models import Booking

booking = Booking.objects.get(id=1)
print(f"Status: {booking.booking_status}")
print(f"Can confirm: {booking.booking_status == 'pending'}")
print(f"Can mark as in-use: {booking.booking_status == 'confirmed'}")
```

### Calculate Commission

```python
from bookings.services import calculate_booking_price

result = calculate_booking_price(
    listing_id=1,
    start_date='2026-03-01',
    end_date='2026-03-05'
)
print(f"Guest pays: {result['guest_total']}")
print(f"Host receives: {result['host_payout']}")
```

---

## 📦 Dependencies

### Backend
```
Django==4.2.7
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.0
psycopg2-binary==2.9.9
django-cors-headers==4.3.1
Pillow==10.1.0
razorpay==1.4.1
qrcode==7.4.2
python-decouple==3.8
gunicorn==21.2.0
```

### Frontend
```
react@^18.2.0
react-router-dom@^6.20.0
axios@^1.6.2
react-toastify@^9.1.3
qrcode.react@^3.1.0
date-fns@^2.30.0
```

---

## 🚀 Performance Tips

- Use pagination (20 items per page default)
- Avoid N+1 queries with `select_related()`
- Cache frequently accessed data
- Compress images for listings
- Use CDN for static files in production

---

## 📞 Quick Support

**Backend Won't Start:**
```bash
# Check port
lsof -i :8001

# Reset migrations
python manage.py migrate --fake booking zero
python manage.py migrate

# Check logs
tail -f django.log
```

**Frontend Won't Load:**
```bash
# Clear cache
rm -rf node_modules
npm install

# Check API URL
grep REACT_APP .env

# Check console
# Open DevTools → Console tab
```

**Database Issues:**
```bash
# Connect to database
python manage.py dbshell

# Check tables
\dt

# Check user data
SELECT * FROM users_user;
```

---

## 🎯 Feature Checklist

### User Management
- [ ] Register user
- [ ] Login user
- [ ] Update profile
- [ ] Change password

### Listing Management
- [ ] Create listing
- [ ] Edit listing
- [ ] Upload images
- [ ] Delete listing

### Booking Management
- [ ] Create booking
- [ ] Cancel booking
- [ ] View my bookings
- [ ] Confirm booking (host)

### Advanced
- [ ] Generate QR code
- [ ] Scan QR code
- [ ] Raise dispute
- [ ] Resolve dispute (admin)
- [ ] Submit KYC
- [ ] Verify KYC (admin)
- [ ] Process payment
- [ ] Generate report (admin)

---

## 🌐 Useful Links

- **Django Docs:** https://docs.djangoproject.com/
- **DRF Docs:** https://www.django-rest-framework.org/
- **React Docs:** https://react.dev/
- **JWT Tutorial:** https://jwt.io/introduction
- **Razorpay Docs:** https://razorpay.com/docs/

---

**Last Updated:** Feb 24, 2026
**Version:** 1.0
