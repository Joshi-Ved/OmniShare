from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions
from decouple import config

import firebase_admin
from firebase_admin import auth, credentials


def _initialize_firebase_admin():
    if firebase_admin._apps:
        return

    credentials_path = config('FIREBASE_CREDENTIALS_FILE', default='').strip()
    project_id = config('FIREBASE_PROJECT_ID', default='').strip()

    if credentials_path:
        firebase_admin.initialize_app(credentials.Certificate(credentials_path))
        return

    options = {'projectId': project_id} if project_id else None
    firebase_admin.initialize_app(options=options)


def _build_unique_username(user_model, seed_value):
    base = (seed_value or 'user').split('@')[0].strip() or 'user'
    username = base
    counter = 1

    while user_model.objects.filter(username=username).exists():
        username = f"{base}{counter}"
        counter += 1

    return username


class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        header = authentication.get_authorization_header(request).split()

        if not header:
            return None

        if header[0].lower() != b'bearer':
            return None

        if len(header) == 1:
            raise exceptions.AuthenticationFailed('Invalid token header. No credentials provided.')

        if len(header) > 2:
            raise exceptions.AuthenticationFailed('Invalid token header. Token string should not contain spaces.')

        try:
            token = header[1].decode('utf-8')
        except UnicodeDecodeError as exc:
            raise exceptions.AuthenticationFailed('Invalid token header. Token string should be UTF-8.') from exc

        try:
            _initialize_firebase_admin()
            decoded_token = auth.verify_id_token(token)
        except Exception as exc:
            raise exceptions.AuthenticationFailed('Invalid Firebase token.') from exc

        user_model = get_user_model()
        email = decoded_token.get('email')
        uid = decoded_token.get('uid')
        display_name = decoded_token.get('name')

        if not uid:
            raise exceptions.AuthenticationFailed('Firebase token missing uid.')

        user = None
        if email:
            user = user_model.objects.filter(email=email).first()

        if not user:
            user = user_model.objects.filter(username=uid).first()

        if not user:
            username_seed = display_name or email or uid
            username = _build_unique_username(user_model, username_seed)
            user = user_model.objects.create_user(
                username=username,
                email=email or f"{uid}@firebase.local",
                password=None,
            )

        updates = []

        if email and user.email != email:
            user.email = email
            updates.append('email')

        if updates:
            user.save(update_fields=updates)

        return user, None
