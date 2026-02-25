from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
import os
import json

User = get_user_model()


class Command(BaseCommand):
    help = 'Sync user data to Firebase Firestore'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting Firebase Firestore sync...'))

        try:
            import firebase_admin
            from firebase_admin import credentials, firestore
            from omnishare.settings import BASE_DIR
        except ImportError:
            self.stdout.write(self.style.ERROR('Firebase admin SDK not installed'))
            return

        try:
            # Initialize Firebase App if not already initialized
            if not firebase_admin._apps:
                # Try to get credentials from environment
                firebase_creds_path = os.path.join(BASE_DIR, 'omnishare_firebase_key.json')
                
                if os.path.exists(firebase_creds_path):
                    cred = credentials.Certificate(firebase_creds_path)
                    firebase_admin.initialize_app(cred, {
                        'databaseURL': 'https://omnishare-5fb53.firebaseio.com'
                    })
                else:
                    # Try using FIREBASE_* environment variables
                    try:
                        firebase_admin.initialize_app()
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'Could not initialize Firebase: {str(e)}'))
                        self.stdout.write(self.style.WARNING('Make sure GOOGLE_APPLICATION_CREDENTIALS env var is set'))
                        return

            db = firestore.client()
            
            # Get all users
            users = User.objects.all()
            synced_count = 0
            
            for user in users:
                try:
                    user_data = {
                        'uid': str(user.id),
                        'username': user.username,
                        'email': user.email,
                        'firstName': user.first_name,
                        'lastName': user.last_name,
                        'phoneNumber': user.phone_number or '',
                        'role': user.role,
                        'kycStatus': user.kyc_status,
                        'trustScore': float(user.trust_score),
                        'goldHostFlag': user.gold_host_flag,
                        'totalBookings': user.total_bookings,
                        'successfulBookings': user.successful_bookings,
                        'cancelledBookings': user.cancelled_bookings,
                        'disputedBookings': user.disputed_bookings,
                        'createdAt': user.created_at.isoformat() if user.created_at else timezone.now().isoformat(),
                        'updatedAt': user.updated_at.isoformat() if user.updated_at else timezone.now().isoformat(),
                    }
                    
                    # Use username as document ID for easier lookups
                    db.collection('users').document(user.username).set(user_data, merge=True)
                    synced_count += 1
                    
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'Failed to sync user {user.username}: {str(e)}'))
            
            self.stdout.write(self.style.SUCCESS(f'✓ Synced {synced_count} users to Firestore'))
            self.stdout.write(self.style.SUCCESS('\n✅ Firebase Firestore sync completed!'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error during Firebase sync: {str(e)}'))
            import traceback
            traceback.print_exc()
