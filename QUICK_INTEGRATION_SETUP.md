# Experiment 5: Quick Integration Setup

**Getting Started with Payment Integration**

---

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd omnishare_backend
pip install razorpay reportlab
```

### Step 2: Configure Settings
Edit `omnishare/settings.py`:

```python
# Razorpay Configuration
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_xxxxxx')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'xxxxxx')
RAZORPAY_WEBHOOK_SECRET = os.environ.get('RAZORPAY_WEBHOOK_SECRET', 'xxxxxx')

# Email Configuration (for invoice sending)
DEFAULT_FROM_EMAIL = 'noreply@omnishare.com'
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # For testing

# Payment Settings
PAYMENT_SETTINGS = {
    'GUEST_COMMISSION': Decimal('0.06'),  # 6%
    'HOST_COMMISSION': Decimal('0.12'),   # 12%
}
```

### Step 3: Create Migrations
```bash
python manage.py makemigrations payments
python manage.py migrate payments
```

### Step 4: Test Payment Flow

**Create Test Booking**:
```bash
# 1. Register user, create listing, make booking (existing flow)
```

**Create Payment Order**:
```bash
curl -X POST http://localhost:8001/api/payments/create-order/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"booking_id": 1}'
```

**Verify Payment** (after Razorpay):
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

---

## 🔧 Configuration

### Razorpay Sandbox Setup

1. **Create Razorpay Account**
   - Go to https://razorpay.com/
   - Sign up for account
   - Verify email

2. **Get Sandbox Keys**
   - Dashboard → Settings → API Keys
   - Copy Key ID and Key Secret
   - Use these for testing

3. **Set Environment Variables**
   ```bash
   export RAZORPAY_KEY_ID=rzp_test_xxxxxx
   export RAZORPAY_KEY_SECRET=your_secret
   ```

4. **Webhook Configuration**
   - Dashboard → Settings → Webhooks
   - Add webhook: `http://your-domain/api/webhooks/razorpay_webhook/`
   - Subscribe to events:
     - `payment.authorized`
     - `payment.failed`
     - `refund.created`
     - `settlement.processed`

### Test Payment Cards

**Success Card**:
```
Card: 4111111111111111
Exp: 12/25
CVV: 123
OTP: 000000
```

**Failed Card**:
```
Card: 4222222222222220
Exp: 12/25
CVV: 123
```

---

## 🎯 Key Endpoints

### Payment Endpoints

```
POST /api/payments/create-order/
  ↓
Returns: order_id, amount, razorpay_key_id

POST /api/payments/verify/
  ↓
Returns: transaction details, booking confirmation

POST /api/payments/refund/
  ↓
Returns: refund status, refund_id

GET /api/payments/transactions/
  ↓
Returns: List of user transactions

GET /api/payments/settlements/
  ↓
Returns: List of user settlements
```

### Invoice Endpoints

```
GET /api/invoices/
  ↓
Returns: List of invoices

POST /api/invoices/{id}/resend_email/
  ↓
Returns: Email sent confirmation

GET /api/invoices/{id}/download/
  ↓
Returns: PDF file
```

### Webhook Endpoint

```
POST /api/webhooks/razorpay_webhook/
  ↓
Handles: payment.authorized, payment.failed, 
         refund.created, settlement.processed
```

---

## 📊 Commission Breakdown

### Example: ₹10,000 Booking

**Guest Pays**:
- Rental: ₹10,000
- Commission (6%): ₹600
- **Total: ₹10,600**

**Host Receives**:
- Rental: ₹10,000
- Commission (-12%): -₹1,200
- **Total: ₹8,800**

**Platform Earnings**: ₹1,800 (18%)

---

## 🧪 Testing Checklist

- [ ] Install dependencies
- [ ] Configure Razorpay keys
- [ ] Create migrations
- [ ] Run migrations
- [ ] Create test booking
- [ ] Test payment order creation
- [ ] Test payment verification
- [ ] Test refund processing
- [ ] Test invoice download
- [ ] Test settlement creation
- [ ] Check WebhookLog entries
- [ ] Verify email notifications

---

## 🐛 Common Issues

### Issue: "ModuleNotFoundError: No module named 'razorpay'"
**Solution**: 
```bash
pip install razorpay
```

### Issue: "ModuleNotFoundError: No module named 'reportlab'"
**Solution**: 
```bash
pip install reportlab
```

### Issue: Payment Verification Fails
**Solution**:
1. Verify Razorpay keys are correct
2. Check signature format
3. Verify order ID from response

### Issue: Webhook Not Processing
**Solution**:
1. Verify webhook URL in Razorpay dashboard
2. Check WebhookLog table for failures
3. Verify webhook payload format

### Issue: Invoices Not Sending
**Solution**:
1. Configure EMAIL_BACKEND in settings
2. For testing: `django.core.mail.backends.console.EmailBackend`
3. For production: Use SMTP backend

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `PAYMENT_INTEGRATION_GUIDE.md` | Complete guide (read this first) |
| `EXPERIMENT_5_SUMMARY.md` | Implementation summary |
| `PAYMENT_INTEGRATION_CHECKLIST.md` | Verification checklist |
| `QUICK_INTEGRATION_SETUP.md` | This file |

---

## ⚙️ File Locations

### Backend Files
- `payments/models_enhanced.py` - Database models
- `payments/payment_services.py` - Service layer
- `payments/views_enhanced.py` - API views
- `payments/serializers_enhanced.py` - Serializers
- `payments/urls.py` - URL routing

### Frontend Files
- `src/pages/PaymentPage.jsx` - Payment component
- `src/pages/PaymentPage.css` - Styles

---

## 🚀 Next Steps

1. **Read Documentation**
   ```
   Read: PAYMENT_INTEGRATION_GUIDE.md
   ```

2. **Setup Development Environment**
   ```bash
   pip install razorpay reportlab
   python manage.py makemigrations payments
   python manage.py migrate payments
   ```

3. **Configure Razorpay**
   - Create account at razorpay.com
   - Get sandbox keys
   - Set environment variables

4. **Test Payment Flow**
   - Create booking
   - Initiate payment
   - Use test card
   - Verify payment

5. **Deploy to Production**
   - Follow TESTING_DEPLOYMENT_GUIDE.md
   - Configure live Razorpay keys
   - Set up webhooks
   - Monitor transactions

---

## 📞 Support

- **Documentation**: See PAYMENT_INTEGRATION_GUIDE.md
- **Troubleshooting**: See PAYMENT_INTEGRATION_GUIDE.md (Troubleshooting section)
- **Razorpay Docs**: https://razorpay.com/docs/
- **Code Comments**: Check code in payment_services.py

---

## ✅ Quick Reference

### Get Payment Order
```bash
curl -X POST http://localhost:8001/api/payments/create-order/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"booking_id": 1}'
```

### Verify Payment
```bash
curl -X POST http://localhost:8001/api/payments/verify/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "razorpay_order_id": "order_ID",
    "razorpay_payment_id": "pay_ID",
    "razorpay_signature": "SIGNATURE"
  }'
```

### Process Refund
```bash
curl -X POST http://localhost:8001/api/payments/refund/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"booking_id": 1, "reason": "cancellation"}'
```

### List Transactions
```bash
curl -X GET http://localhost:8001/api/payments/transactions/ \
  -H "Authorization: Bearer TOKEN"
```

### Download Invoice
```bash
curl -X GET http://localhost:8001/api/invoices/1/download/ \
  -H "Authorization: Bearer TOKEN" \
  --output invoice.pdf
```

---

**Ready to go! Start with PAYMENT_INTEGRATION_GUIDE.md** 🚀
