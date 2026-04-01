#!/bin/bash
# Startup Script
# Handles database migrations, static file collection, and server startup

set -e

echo "🚀 OmniShare Backend Startup"
echo "=============================="

# Change to app directory
cd /app

# Step 1: Run Database Migrations
echo "📦 Running database migrations..."
python manage.py migrate --noinput

# Step 2: Collect Static Files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput --clear

# Step 3: Create Superuser (optional, for first deployment)
if [ "$CREATE_SUPERUSER" = "true" ]; then
    echo "👤 Creating superuser..."
    python manage.py createsuperuser --noinput \
        --username admin \
        --email admin@omnishare.com || echo "Superuser already exists"
fi

# Step 4: Start Gunicorn Server
echo "🌐 Starting Gunicorn server..."
exec gunicorn omnishare.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 4 \
    --worker-class sync \
    --worker-tmp-dir /dev/shm \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
