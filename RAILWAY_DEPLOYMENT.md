# OmniShare Railway Deployment & Security Guide

## 🚀 Quick Start: Railway Deployment

### Prerequisites
- Railway CLI installed: `curl -L railway.app/install.sh | bash`
- MongoDB URL ready (paste when asked)
- Razorpay & Stripe API keys
- Clerk authentication keys

### Step 1: Prepare Environment Variables

**In Telegraph Dashboard:**
```bash
railway link  # Link to your Railway project
railway env  # View current variables
```

**Add these to Railway Environment:**
```
MONGODB_URL=your_mongo_connection_string
SECRET_KEY=generate-with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DEBUG=False
```

### Step 2: Deploy Backend

```bash
cd omnishare_backend
railway up
railway logs  # Watch deployment logs
```

The Railway deployment will automatically:
1. Read `railway.toml` configuration
2. Build Docker image from `Dockerfile`
3. Run migrations: `python manage.py migrate`
4. Collect static files: `python manage.py collectstatic --no-input`
5. Start gunicorn server on port $PORT

---

## 🔒 OWASP Security Implementation

### 1. SQL Injection Prevention
**File:** [`omnishare_backend/omnishare/security.py`](omnishare_backend/omnishare/security.py#L45-L85)

- ✅ Django ORM parameterized queries automatically prevent SQL injection
- ✅ Added `SQLInjectionProtection.validate_search_input()` for search parameters
- ✅ All database queries use model QuerySets (anti-ORM is not used)

**How to use:**
```python
from omnishare.security import SQLInjectionProtection

# For search functionality
safe_search_term = SQLInjectionProtection.validate_search_input(user_input)
results = Model.objects.filter(name__icontains=safe_search_term)
```

### 2. Input Validation & Sanitization
**File:** [`omnishare_backend/omnishare/security.py`](omnishare_backend/omnishare/security.py#L13-L42)

Validators available:
- `InputValidator.validate_email()` - Email format validation
- `InputValidator.validate_phone()` - Phone number validation
- `InputValidator.validate_username()` - Username format
- `InputValidator.sanitize_string()` - Remove HTML/script tags (XSS prevention)

**Usage in Serializers:**
```python
from omnishare.serializer_validators import SafeCharField

class MySerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = SafeCharField(max_length=255)  # Auto-sanitized
```

### 3. API Rate Limiting
**File:** [`omnishare_backend/omnishare/throttles.py`](omnishare_backend/omnishare/throttles.py)

Implemented rates:
- **Anonymous users:** 200 requests/hour
- **Authenticated users:** 2000 requests/hour
- **Search endpoints:** 50 requests/hour
- **Payment operations:** 20 requests/hour (strict for fraud prevention)
- **Login attempts:** 10 requests/hour (brute force prevention)
- **Booking operations:** 100 requests/hour

**Apply to specific endpoints:**
```python
from omnishare.throttles import PaymentThrottle
from rest_framework.decorators import throttle_classes

@api_view(['POST'])
@throttle_classes([PaymentThrottle])
def process_payment(request):
    pass
```

### 4. CSRF & Security Headers
**File:** [`omnishare_backend/omnishare/middleware.py`](omnishare_backend/omnishare/middleware.py)

Implemented headers:
- **X-Content-Type-Options: nosniff** - Prevents MIME sniffing
- **X-Frame-Options: DENY** - Prevents clickjacking
- **Content-Security-Policy** - Prevents XSS attacks
- **Strict-Transport-Security** - Forces HTTPS
- **Referrer-Policy** - Controls referrer information

**Automatic CSRF tokens** in all forms (Django built-in)

### 5. XSS Protection
**File:** [`omnishare_backend/omnishare/security.py`](omnishare_backend/omnishare/security.py#L88-L104)

- `XSSProtection.sanitize_html()` - Remove script tags
- `XSSProtection.is_safe_url()` - Validate URLs (no javascript: protocol)

---

## 📁 Configuration Files Created

### 1. Railway Configuration
**File:** [`railway.toml`](railway.toml)

```toml
[build]
builder = "dockerfile"

[deploy]
startCommand = "cd omnishare_backend && python manage.py migrate && gunicorn omnishare.wsgi:application --bind 0.0.0.0:$PORT"
```

### 2. Production Environment
**File:** [`omnishare_backend/.env.production`](omnishare_backend/.env.production)

Copy and configure:
```bash
cp omnishare_backend/.env.production omnishare_backend/.env.local
# Edit with your actual values
```

### 3. Security Utilities
- [`omnishare_backend/omnishare/security.py`](omnishare_backend/omnishare/security.py) - OWASP utilities
- [`omnishare_backend/omnishare/throttles.py`](omnishare_backend/omnishare/throttles.py) - Rate limiting
- [`omnishare_backend/omnishare/serializer_validators.py`](omnishare_backend/omnishare/serializer_validators.py) - Serializer validation
- [`omnishare_backend/omnishare/exception_handler.py`](omnishare_backend/omnishare/exception_handler.py) - Secure error handling
- [`omnishare_backend/omnishare/middleware.py`](omnishare_backend/omnishare/middleware.py) - Security middleware

---

## 🗄️ MongoDB Integration

### Setup in Django

MongoDB URL is automatically detected from `MONGODB_URL` environment variable:

```python
# omnishare_backend/omnishare/settings.py
MONGODB_URL = config('MONGODB_URL', default='').strip()
if MONGODB_URL:
    from pymongo import MongoClient
    MONGO_CLIENT = MongoClient(MONGODB_URL)
    MONGO_DB = MONGO_CLIENT.get_database()
```

### Usage Example

```python
# In your views or services
from django.conf import settings

def log_event_to_mongo(event_data):
    if settings.MONGO_DB:
        collection = settings.MONGO_DB['events']
        collection.insert_one(event_data)
```

---

## 🚢 Deployment Steps

### 1. Create Railway Project
```bash
railway init
# Choose: Python
# Choose: Use current directory
```

### 2. Configure Database
```bash
railway add  # Add PostgreSQL plugin (optional)
# Or use MongoDB URL in environment variables
```

### 3. Set Environment Variables
```bash
railway env PORT 8000  # Optional
railway env MONGODB_URL your_mongo_url
railway env SECRET_KEY your_secret_key
# ... add other variables
```

### 4. Deploy
```bash
git add .
git commit -m "Deploy to Railway with OWASP security"
git push origin main

railway up
```

### 5. Verify Deployment
```bash
railway logs  # Watch logs in real-time
railway ps   # View running processes

# Test endpoint
curl https://your-railway-domain.railway.app/api/health/
```

---

## 📋 Security Checklist

- [ ] **Database**: MongoDB URL configured
- [ ] **Secrets**: All keys in environment variables (not in code)
- [ ] **SSL/TLS**: HTTPS enforced (Railway provides automatically)
- [ ] **CORS**: Only allowed origins configured
- [ ] **Rate Limiting**: All endpoints configured
- [ ] **Validation**: Input validation on all user inputs
- [ ] **Headers**: Security headers enabled
- [ ] **Logging**: Security events being logged
- [ ] **Dependencies**: `requirements.txt` updated (boto3 removed)
- [ ] **Middleware**: All security middleware enabled

---

## 🔍 Testing Security

### Test Rate Limiting
```bash
# Will get 429 after 201 requests
for i in {1..210}; do
    curl -H "X-Forwarded-For: 127.0.0.$((i % 255))" \
         https://your-domain/api/endpoint/
done
```

### Test Input Validation
```bash
# SQL injection attempt (should be blocked)
curl -X GET "https://your-domain/api/search/?q=test' OR '1'='1"

# Should return sanitized error
```

### Test Security Headers
```bash
curl -I https://your-domain/api/endpoint/
# Check response headers for X-Content-Type-Options, CSP, etc.
```

---

## 🆘 Troubleshooting

### "No start command detected"
✅ **Fixed**: Added `startCommand` in `railway.toml`

### Database connection failed
```bash
railway env DATABASE_URL postgresql://...
railway restart
```

### Static files not loading
```bash
railway run python omnishare_backend/manage.py collectstatic --no-input
```

### MongoDB connection timeout
- Check MongoDB URL format
- Ensure IP is whitelisted in MongoDB Atlas
- Verify connection string includes database name

---

## 📚 OWASP References

- **Top 10 API Security Risks**: https://owasp.org/www-project-api-security/
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **API Rate Limiting**: https://owasp.org/www-community/attacks/API_abuse
- **SQL Injection Prevention**: https://owasp.org/www-community/attacks/SQL_Injection
- **XSS Prevention**: https://owasp.org/www-community/attacks/xss/

---

## 📞 Support

For Railway issues: https://docs.railway.app/
For Django security: https://docs.djangoproject.com/en/stable/topics/security/
For MongoDB: https://docs.mongodb.com/

---

**Deployment Date:** April 1, 2026
**Status:** ✅ Ready for Production
