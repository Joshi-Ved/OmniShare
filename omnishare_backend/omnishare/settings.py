"""
Django settings for omnishare project.
"""

from pathlib import Path
from datetime import timedelta
from urllib.parse import parse_qs, urlparse
from decouple import config


def _get_list_from_csv(name, default=''):
    raw = config(name, default=default)
    return [item.strip() for item in raw.split(',') if item.strip()]

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Security settings
SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-key-change-in-production')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = _get_list_from_csv('ALLOWED_HOSTS', default='localhost,127.0.0.1')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    
    # Local apps
    'users',
    'listings',
    'bookings',
    'payments',
    'crm',
    'marketing',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'omnishare.middleware.SecurityHeadersMiddleware',
    'omnishare.middleware.SecurityAuditMiddleware',
    'omnishare.middleware.RateLimitHeadersMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'omnishare.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'omnishare.wsgi.application'

# Database
# Using SQLite for demo (change to PostgreSQL for production)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

DATABASE_URL = config('DATABASE_URL', default='').strip()
if DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    query = parse_qs(parsed.query)
    db_options = {}

    if query.get('sslmode'):
        db_options['sslmode'] = query['sslmode'][0]
    if query.get('channel_binding'):
        db_options['channel_binding'] = query['channel_binding'][0]

    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': parsed.path.lstrip('/'),
        'USER': parsed.username,
        'PASSWORD': parsed.password,
        'HOST': parsed.hostname,
        'PORT': parsed.port or '5432',
        'OPTIONS': db_options,
    }

# ===================================
# MongoDB Configuration
# Use this for analytics, logs, or non-relational data
# ===================================
MONGODB_URL = config('MONGODB_URL', default='').strip()
if MONGODB_URL:
    from pymongo import MongoClient
    try:
        MONGO_CLIENT = MongoClient(MONGODB_URL)
        MONGO_DB = MONGO_CLIENT.get_database()
    except Exception as e:
        MONGO_DB = None
        if not DEBUG:
            raise Exception(f"MongoDB connection failed: {str(e)}")
else:
    MONGO_CLIENT = None
    MONGO_DB = None

# For PostgreSQL (uncomment for production):
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': config('DATABASE_NAME', default='omnishare_db'),
#         'USER': config('DATABASE_USER', default='postgres'),
#         'PASSWORD': config('DATABASE_PASSWORD', default='postgres'),
#         'HOST': config('DATABASE_HOST', default='localhost'),
#         'PORT': config('DATABASE_PORT', default='5432'),
#     }
# }

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework settings with OWASP Rate Limiting
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'omnishare.throttles.UserThrottle',
        'omnishare.throttles.AnonThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'user': '2000/hour',           # Authenticated users
        'anon': '200/hour',             # Anonymous users
        'search': '50/hour',            # Search queries
        'payment': '20/hour',           # Payment operations
        'login': '10/hour',             # Login attempts
        'booking': '100/hour',          # Booking operations
        'lead_capture': '30/hour',      # Lead capture forms
    },
    'EXCEPTION_HANDLER': 'omnishare.exception_handler.custom_exception_handler',
}

# CORS Settings
CORS_ALLOWED_ORIGINS = _get_list_from_csv(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001'
)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = _get_list_from_csv('CSRF_TRUSTED_ORIGINS', default='')

# Razorpay Settings
RAZORPAY_KEY_ID = config('RAZORPAY_KEY_ID', default='')
RAZORPAY_KEY_SECRET = config('RAZORPAY_KEY_SECRET', default='')

# Stripe Settings
STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default='')
STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='')
STRIPE_USE_DEMO = config('STRIPE_USE_DEMO', default=True, cast=bool)
FRONTEND_BASE_URL = config('FRONTEND_BASE_URL', default='http://localhost:3000')

# Clerk Settings
CLERK_SECRET_KEY = config('CLERK_SECRET_KEY', default='')
CLERK_PUBLISHABLE_KEY = config('CLERK_PUBLISHABLE_KEY', default='')

# Cloud-first deployment: keep local media storage by default.
# For production, mount persistent storage or plug an external object store.

# Security Settings
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
    SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_SAMESITE = 'Lax'
    CSP_DEFAULT_SRC = ("'self'",)
    CSP_SCRIPT_SRC = ("'self'", 'https://checkout.razorpay.com')
    CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
    CSP_IMG_SRC = ("'self'", 'data:', 'https:')
    CSP_CONNECT_SRC = ("'self'", 'https:')
    X_FRAME_OPTIONS = 'DENY'

# Email Settings (for production)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Commission Settings
PLATFORM_COMMISSION_HOST = 0.12  # 12% from host
PLATFORM_COMMISSION_GUEST = 0.06  # 6% added to guest
TOTAL_PLATFORM_COMMISSION = 0.18  # 18% total

# Business Rules
MINIMUM_BOOKING_HOURS = 24
CANCELLATION_WINDOW_HOURS = 48
GOLD_HOST_BOOKINGS_THRESHOLD = 10
GOLD_HOST_RATING_THRESHOLD = 4.5
