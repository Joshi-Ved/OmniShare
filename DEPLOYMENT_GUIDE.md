# OmniShare - Deployment Guide

## 🚀 Production Deployment

### Prerequisites
- Ubuntu 20.04+ or similar Linux distribution
- Python 3.8+
- PostgreSQL 13+
- Node.js 16+
- Nginx web server
- SSL certificate (Let's Encrypt recommended)

---

## 1️⃣ Backend Deployment

### 1.1 Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3-pip python3-venv postgresql postgresql-contrib nginx nodejs npm git

# Create app directory
sudo mkdir -p /var/www/omnishare
cd /var/www/omnishare

# Clone repository
git clone <your-repo-url> .
```

### 1.2 Python Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
pip install gunicorn psycopg2-binary

# Install additional production packages
pip install whitenoise django-cors-headers python-decouple
```

### 1.3 PostgreSQL Setup

```bash
# Create database and user
sudo -u postgres psql

postgres=# CREATE DATABASE omnishare_prod;
postgres=# CREATE USER omnishare WITH PASSWORD 'secure_password_here';
postgres=# ALTER ROLE omnishare SET client_encoding TO 'utf8';
postgres=# ALTER ROLE omnishare SET default_transaction_isolation TO 'read committed';
postgres=# ALTER ROLE omnishare SET default_transaction_deferrable TO on;
postgres=# ALTER ROLE omnishare SET timezone TO 'Asia/Kolkata';
postgres=# GRANT ALL PRIVILEGES ON DATABASE omnishare_prod TO omnishare;
postgres=# \q
```

### 1.4 Environment Configuration

Create `.env` file in `/var/www/omnishare/omnishare_backend/`:

```env
# Database
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=omnishare_prod
DATABASE_USER=omnishare
DATABASE_PASSWORD=secure_password_here
DATABASE_HOST=localhost
DATABASE_PORT=5432

# Django Settings
SECRET_KEY=your-very-long-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,api.yourdomain.com

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# AWS S3 (Optional)
USE_S3=True
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_STORAGE_BUCKET_NAME=your_bucket_name
AWS_S3_REGION_NAME=ap-south-1

# Email (Optional)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
```

### 1.5 Django Setup

```bash
# Navigate to backend
cd /var/www/omnishare/omnishare_backend

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Create superuser
python manage.py createsuperuser

# Create default categories
python manage.py shell
>>> from listings.models import Category
>>> categories = [
>>>     ('Electronics', 'electronics'),
>>>     ('Sports', 'sports'),
>>>     ('Vehicles', 'vehicles'),
>>>     ('Tools', 'tools'),
>>> ]
>>> for name, slug in categories:
>>>     Category.objects.get_or_create(name=name, slug=slug)
```

### 1.6 Gunicorn Setup

Create `/etc/systemd/system/omnishare.service`:

```ini
[Unit]
Description=OmniShare Gunicorn Application
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/omnishare/omnishare_backend
ExecStart=/var/www/omnishare/venv/bin/gunicorn \
    --workers 3 \
    --worker-class sync \
    --bind unix:/var/www/omnishare/omnishare.sock \
    --timeout 120 \
    omnishare.wsgi:application

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable omnishare
sudo systemctl start omnishare
sudo systemctl status omnishare
```

---

## 2️⃣ Frontend Deployment

### 2.1 Build React App

```bash
cd /var/www/omnishare/omnishare_frontend

# Set production API URL
REACT_APP_API_URL=https://api.yourdomain.com/api npm run build

# This creates optimized build in build/
```

### 2.2 Nginx Configuration

Create `/etc/nginx/sites-available/omnishare`:

```nginx
# Backend API
upstream omnishare_backend {
    server unix:/var/www/omnishare/omnishare.sock;
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript;

    # Frontend (React app)
    location / {
        root /var/www/omnishare/omnishare_frontend/build;
        try_files $uri /index.html;
        expires 30d;
    }

    # API Backend
    location /api/ {
        proxy_pass http://omnishare_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers (if needed)
        add_header 'Access-Control-Allow-Origin' '*';
    }

    # Admin panel
    location /admin/ {
        proxy_pass http://omnishare_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /var/www/omnishare/omnishare_backend/staticfiles/;
        expires 30d;
    }

    # Media files
    location /media/ {
        alias /var/www/omnishare/omnishare_backend/media/;
        expires 7d;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/omnishare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2.3 SSL Certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## 3️⃣ Database Backup & Maintenance

### Automated Backup Script

Create `/var/www/omnishare/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/omnishare"
DB_NAME="omnishare_prod"
DB_USER="omnishare"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup media files
tar -czf $BACKUP_DIR/media_$DATE.tar.gz /var/www/omnishare/omnishare_backend/media/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR"
```

Make executable and schedule with cron:

```bash
chmod +x /var/www/omnishare/backup.sh

# Add to crontab (runs daily at 2 AM)
sudo crontab -e
0 2 * * * /var/www/omnishare/backup.sh
```

---

## 4️⃣ Monitoring & Logging

### 4.1 Application Logging

Update `settings.py`:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/www/omnishare/logs/django.log',
            'maxBytes': 1024000,
            'backupCount': 3,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['file'],
        'level': 'INFO',
    },
}
```

### 4.2 System Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Install PM2 for Node.js process management (if needed)
sudo npm install -g pm2
```

---

## 5️⃣ Performance Optimization

### 5.1 Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_booking_status ON bookings_booking(booking_status);
CREATE INDEX idx_listing_category ON listings_listing(category_id);
CREATE INDEX idx_booking_dates ON bookings_booking(start_date, end_date);
CREATE INDEX idx_user_role ON users_user(role);
```

### 5.2 Cache Configuration

Update `settings.py`:

```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Install: pip install django-redis redis
```

---

## 6️⃣ Security Checklist

- [ ] Set `DEBUG = False` in production
- [ ] Use strong `SECRET_KEY`
- [ ] Set secure `ALLOWED_HOSTS`
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Use environment variables for sensitive data
- [ ] Enable rate limiting
- [ ] Configure firewall rules
- [ ] Set up DDoS protection (Cloudflare recommended)
- [ ] Regular security updates
- [ ] Database backups automated
- [ ] Log monitoring configured
- [ ] Error tracking (Sentry recommended)

---

## 7️⃣ Troubleshooting

### Common Issues

**502 Bad Gateway:**
```bash
sudo systemctl restart omnishare
sudo systemctl status omnishare
tail -f /var/www/omnishare/omnishare.sock
```

**Database Connection Error:**
```bash
sudo -u postgres psql
\du  # Check users
\l   # Check databases
```

**Static Files Not Loading:**
```bash
python manage.py collectstatic --noinput --clear
sudo chown -R www-data:www-data /var/www/omnishare/
```

**Nginx Not Responding:**
```bash
sudo nginx -t
sudo systemctl restart nginx
sudo journalctl -u nginx -n 50
```

---

## 8️⃣ Updating Application

```bash
cd /var/www/omnishare

# Pull latest code
git pull origin main

# Activate venv
source venv/bin/activate

# Install new dependencies
pip install -r requirements.txt

# Run migrations
cd omnishare_backend
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Restart services
sudo systemctl restart omnishare
sudo systemctl restart nginx

# Rebuild frontend
cd ../omnishare_frontend
npm install
npm run build
```

---

## 9️⃣ Performance Benchmarks

**Target Metrics:**
- Page Load: < 2 seconds
- API Response: < 200ms
- Uptime: > 99.5%
- Database Queries: < 10 per request

**Testing:**
```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 https://yourdomain.com/api/listings/

# Monitor with
watch -n 1 'systemctl status omnishare'
```

---

## 🔟 Scaling Considerations

### Horizontal Scaling

1. **Load Balancer:** Use Nginx or HAProxy
2. **Multiple Gunicorn Workers:** Configure in systemd service
3. **Separate Database Server:** Move PostgreSQL to dedicated machine
4. **Redis Cache Layer:** For session/cache management
5. **CDN:** Cloudflare for static files
6. **Microservices:** Consider separating payment, email, notifications

---

## Support & Documentation

- Backend: http://localhost:8001/api/
- Admin Panel: http://localhost:8001/admin/
- API Docs: See API_DOCUMENTATION.md
- Testing: See TESTING_GUIDE.md
