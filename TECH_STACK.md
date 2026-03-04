# OmniShare Tech Stack

## Project Overview
OmniShare is a full-stack peer-to-peer rental marketplace built with a Django REST backend and a React frontend, with Firebase-based authentication and Razorpay-based payments.

## Frontend Stack
- React 18
- React Router DOM 6
- Axios
- React Toastify
- Firebase Web SDK
- qrcode.react
- date-fns
- Testing Library (React, Jest DOM, User Event)
- Build tooling: react-scripts (Create React App)

## Backend Stack
- Python 3
- Django 4.2.7
- Django REST Framework 3.14.0
- django-cors-headers
- python-decouple
- Firebase Admin SDK
- Razorpay Python SDK
- Pillow
- qrcode
- ReportLab

## Database
- SQLite (current development setup)
- PostgreSQL (production-ready support via psycopg2-binary)

## Authentication & Authorization
- Firebase Authentication (token-based)
- Custom Django authentication integration (`FirebaseAuthentication`)
- Role-based access patterns (guest, host, admin)

## Payments
- Razorpay payment gateway integration
- Order creation and signature verification flow
- Platform commission logic implemented in backend

## Storage & Media
- Local media storage for development
- AWS S3 support available for production (boto3 configured)

## Deployment & Runtime
- Gunicorn as WSGI server
- Designed for Nginx + Gunicorn deployment pattern
- Environment-driven configuration with `.env` support

## API & Architecture
- RESTful API architecture
- Modular Django apps:
  - users
  - listings
  - bookings
  - payments
  - crm
  - marketing
- Frontend-backend split architecture:
  - `omnishare_frontend`
  - `omnishare_backend`

## Tooling at Repository Root
- Node package setup for shared Firebase/dotenv usage
- Python dependencies tracked in `requirements.txt`
