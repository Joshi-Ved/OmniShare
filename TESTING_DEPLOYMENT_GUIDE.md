# OmniShare - Testing & Deployment Guide

## Table of Contents
1. [Local Setup](#local-setup)
2. [Database Setup](#database-setup)
3. [Running the Application](#running-the-application)
4. [Testing Guide](#testing-guide)
5. [Deployment Guide](#deployment-guide)

---

## Local Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 13+
- Git

### Backend Setup

1. **Clone the repository**
```bash
git clone https://github.com/Joshi-Ved/OmniShare.git
cd OmniShare/omnishare_backend
```

2. **Create virtual environment**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r ../requirements.txt
```

4. **Create .env file**
```bash
cp ../.env.example .env
```

Edit `.env` and add your credentials:
```env
DEBUG=True
SECRET_KEY=your-secret-key-generate-new-one
DATABASE_NAME=omnishare_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_postgres_password
DATABASE_HOST=localhost
DATABASE_PORT=5432

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_STORAGE_BUCKET_NAME=omnishare-media
```

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd ../omnishare_frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create .env file**
```bash
# Create .env file
echo "REACT_APP_API_URL=http://localhost:8000/api" > .env
```

---

## Database Setup

### PostgreSQL Setup

1. **Install PostgreSQL**
- Download from https://www.postgresql.org/download/

2. **Create database**
```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE omnishare_db;

# Create user (optional)
CREATE USER omnishare_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE omnishare_db TO omnishare_user;

# Exit
\q
```

3. **Run migrations**
```bash
cd omnishare_backend
python manage.py makemigrations
python manage.py migrate
```

4. **Create superuser**
```bash
python manage.py createsuperuser
```

Follow the prompts to create an admin user.

5. **Load sample data (optional)**
```bash
# Create categories
python manage.py shell

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

---

## Running the Application

### Start Backend Server

```bash
cd omnishare_backend
python manage.py runserver
```

Backend will run on: http://localhost:8000

Access Django Admin: http://localhost:8000/admin

### Start Frontend Server

```bash
cd omnishare_frontend
npm start
```

Frontend will run on: http://localhost:3000

---

## Testing Guide

### Manual Testing Steps

#### 1. User Registration & KYC

1. **Register as Guest**
   - Go to http://localhost:3000/register
   - Fill form with role "guest"
   - Submit registration
   - You should be logged in automatically

2. **Submit KYC**
   - Navigate to profile
   - Upload KYC document (any PDF/image)
   - Status should change to "pending"

3. **Admin Verifies KYC**
   - Login as admin at http://localhost:8000/admin
   - Or use admin dashboard at /admin/dashboard
   - Approve the KYC

#### 2. Create Listing (Host Flow)

1. **Register/Login as Host**
   - Register with role "host" or "both"
   - Complete KYC verification

2. **Create Listing**
   - Go to "Create Listing"
   - Fill all required fields
   - Submit listing
   - Status: "pending"

3. **Admin Approves Listing**
   - Admin dashboard → Pending Listings
   - Approve the listing

4. **Upload Images**
   - (Optional) Add via Django admin or implement image upload UI

#### 3. Booking Flow (Guest Flow)

1. **Browse Listings**
   - Visit homepage
   - See approved listings
   - Apply filters

2. **View Listing Details**
   - Click on any listing
   - View full details
   - See host information

3. **Calculate Price**
   - Select dates
   - Click "Calculate Price"
   - See breakdown with commission

4. **Create Booking**
   - Click "Proceed to Book"
   - Booking created with status "pending"

5. **Payment (Simulation)**
   - In production: Razorpay payment gateway
   - For testing: Mark as paid via admin panel

6. **Host Confirms**
   - Host logs in
   - Goes to bookings
   - Confirms booking
   - Status: "confirmed"

7. **Handover**
   - On rental start date
   - Host scans QR code (or enters QR token)
   - Status: "in_use"

8. **Return**
   - After rental period
   - Host marks return
   - Status: "returned"

9. **Complete**
   - Host marks complete
   - Funds released
   - Status: "completed"
   - Trust scores updated

#### 4. Dispute Flow

1. **Raise Dispute**
   - Guest/Host can raise dispute during "in_use" or "returned" status
   - Provide reason
   - Status: "disputed"

2. **Admin Resolution**
   - Admin reviews dispute
   - Provides resolution
   - Decides on refund
   - Status: "completed"

#### 5. Admin Dashboard

1. **Overview**
   - View platform statistics
   - Total users, listings, bookings
   - Revenue metrics

2. **Manage Listings**
   - Approve/reject pending listings

3. **Manage KYC**
   - Verify/reject KYC submissions

4. **Resolve Disputes**
   - View disputed bookings
   - Make decisions

### API Testing with cURL

**Register User:**
```bash
curl -X POST http://localhost:8000/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123",
    "password2": "SecurePass123",
    "role": "guest"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "SecurePass123"
  }'
```

**Get Listings:**
```bash
curl http://localhost:8000/api/listings/
```

**Create Booking (with auth token):**
```bash
curl -X POST http://localhost:8000/api/bookings/create/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "listing": 1,
    "start_date": "2024-02-01",
    "end_date": "2024-02-05",
    "insurance_fee": 300
  }'
```

### Automated Testing

**Backend Tests:**
```bash
cd omnishare_backend
python manage.py test
```

**Frontend Tests:**
```bash
cd omnishare_frontend
npm test
```

---

## Deployment Guide

### AWS Deployment

#### 1. EC2 Setup

1. **Launch EC2 Instance**
   - AMI: Ubuntu 22.04 LTS
   - Instance Type: t2.small or t2.medium
   - Security Group: Allow ports 22, 80, 443, 8000

2. **Connect to EC2**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

3. **Install Dependencies**
```bash
sudo apt update
sudo apt install python3-pip python3-venv postgresql postgresql-contrib nginx git -y
```

4. **Setup PostgreSQL**
```bash
sudo -u postgres psql
CREATE DATABASE omnishare_db;
CREATE USER omnishare_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE omnishare_db TO omnishare_user;
\q
```

5. **Clone & Setup Application**
```bash
git clone https://github.com/Joshi-Ved/OmniShare.git
cd OmniShare/omnishare_backend
python3 -m venv venv
source venv/bin/activate
pip install -r ../requirements.txt
pip install gunicorn
```

6. **Configure Environment**
```bash
nano .env
# Add production settings
DEBUG=False
ALLOWED_HOSTS=your-domain.com,your-ec2-ip
DATABASE_HOST=localhost
# ... other settings
```

7. **Collect Static Files**
```bash
python manage.py collectstatic
python manage.py migrate
```

8. **Setup Gunicorn**
```bash
sudo nano /etc/systemd/system/omnishare.service
```

```ini
[Unit]
Description=OmniShare Gunicorn Daemon
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/OmniShare/omnishare_backend
ExecStart=/home/ubuntu/OmniShare/omnishare_backend/venv/bin/gunicorn \
          --workers 3 \
          --bind 0.0.0.0:8000 \
          omnishare.wsgi:application

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl start omnishare
sudo systemctl enable omnishare
```

9. **Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/omnishare
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /static/ {
        alias /home/ubuntu/OmniShare/omnishare_backend/staticfiles/;
    }

    location /media/ {
        alias /home/ubuntu/OmniShare/omnishare_backend/media/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/omnishare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

10. **Setup SSL (Let's Encrypt)**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

#### 2. RDS Setup (PostgreSQL)

1. Create RDS PostgreSQL instance
2. Update `.env` with RDS endpoint
3. Migrate database

#### 3. S3 Setup (Media Files)

1. Create S3 bucket
2. Configure IAM user with S3 access
3. Update `.env` with AWS credentials
4. Set `USE_S3=True`

#### 4. Frontend Deployment

**Option 1: Same EC2**
```bash
cd omnishare_frontend
npm install
npm run build

# Serve with Nginx
sudo nano /etc/nginx/sites-available/omnishare-frontend
```

```nginx
server {
    listen 80;
    server_name frontend.your-domain.com;
    root /home/ubuntu/OmniShare/omnishare_frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```

**Option 2: Netlify/Vercel**
1. Push code to GitHub
2. Connect to Netlify/Vercel
3. Set build command: `npm run build`
4. Set environment variable: `REACT_APP_API_URL=https://api.your-domain.com`

### Production Checklist

- [ ] DEBUG=False in Django settings
- [ ] Strong SECRET_KEY
- [ ] Proper ALLOWED_HOSTS
- [ ] SSL certificate installed
- [ ] Database backups configured
- [ ] AWS S3 for media files
- [ ] Razorpay production keys
- [ ] Error logging (Sentry)
- [ ] Monitoring (AWS CloudWatch)
- [ ] Regular security updates

### Backup & Monitoring

**Database Backup:**
```bash
# Daily backup script
pg_dump omnishare_db > backup_$(date +%Y%m%d).sql
```

**Application Logs:**
```bash
sudo journalctl -u omnishare -f
```

---

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify credentials in `.env`
   - Check DATABASE_HOST

2. **Static Files Not Loading**
   - Run `python manage.py collectstatic`
   - Check Nginx configuration
   - Verify file permissions

3. **CORS Issues**
   - Update `CORS_ALLOWED_ORIGINS` in settings.py
   - Check frontend API URL

4. **Payment Gateway Errors**
   - Verify Razorpay keys
   - Check webhook configuration
   - Test in sandbox mode first

5. **QR Code Not Generating**
   - Install qrcode library: `pip install qrcode[pil]`
   - Check media directory permissions

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/Joshi-Ved/OmniShare/issues
- Email: support@omnishare.com

---

**Happy Testing!** 🚀
