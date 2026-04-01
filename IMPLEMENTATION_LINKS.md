# OmniShare Implementation Links

## Current Deployment Model

- Frontend: Netlify
- Backend API: Django service (host separately, e.g., Render/Fly/VM)
- Database: MongoDB (or PostgreSQL fallback if enabled)

## Core Application Files

- Frontend entry: [omnishare_frontend/src/App.jsx](omnishare_frontend/src/App.jsx)
- API client: [omnishare_frontend/src/services/api.js](omnishare_frontend/src/services/api.js)
- Profile page: [omnishare_frontend/src/pages/ProfilePage.jsx](omnishare_frontend/src/pages/ProfilePage.jsx)

## Security Implementation

- Security utilities: [omnishare_backend/omnishare/security.py](omnishare_backend/omnishare/security.py)
- Throttling: [omnishare_backend/omnishare/throttles.py](omnishare_backend/omnishare/throttles.py)
- Security middleware: [omnishare_backend/omnishare/middleware.py](omnishare_backend/omnishare/middleware.py)
- Exception handler: [omnishare_backend/omnishare/exception_handler.py](omnishare_backend/omnishare/exception_handler.py)
- Serializer validators: [omnishare_backend/omnishare/serializer_validators.py](omnishare_backend/omnishare/serializer_validators.py)

## Deployment Config

- Netlify config: [netlify.toml](netlify.toml)
- Backend runtime script: [omnishare_backend/run.sh](omnishare_backend/run.sh)
- Backend Docker image recipe: [omnishare_backend/Dockerfile](omnishare_backend/Dockerfile)
- Production env template: [omnishare_backend/.env.production](omnishare_backend/.env.production)

## Env Variables To Check

- Frontend API URL: `REACT_APP_API_URL`
- Clerk key (frontend): `REACT_APP_CLERK_PUBLISHABLE_KEY`
- Django secret: `SECRET_KEY`
- Allowed hosts: `ALLOWED_HOSTS`
- CORS: `CORS_ALLOWED_ORIGINS`
- MongoDB: `MONGODB_URL`

## Local Run

- Backend: `c:/Projects/OmniShare/.venv/Scripts/python.exe omnishare_backend/manage.py runserver 0.0.0.0:8001`
- Frontend: `npm --prefix c:/Projects/OmniShare/omnishare_frontend run start`
