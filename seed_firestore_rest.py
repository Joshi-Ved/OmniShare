"""
Seed Firebase Firestore using the REST API directly.
No Firebase CLI or SDK needed — just requests + API key.

1) Signs in via Firebase Auth REST API to get an ID token
2) Uses Firestore REST API to write documents (bypasses Node.js entirely)
"""

import os, json, random, time, sys
from datetime import datetime

# Try to load .env
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), 'omnishare_frontend', '.env'))
except ImportError:
    pass

try:
    import requests
except ImportError:
    print("Installing requests...")
    os.system(f'"{sys.executable}" -m pip install requests')
    import requests

API_KEY = os.environ.get('REACT_APP_FIREBASE_API_KEY', '')
PROJECT_ID = os.environ.get('REACT_APP_FIREBASE_PROJECT_ID', '')

if not API_KEY or not PROJECT_ID:
    print("ERROR: Missing Firebase config. Check omnishare_frontend/.env")
    sys.exit(1)

print(f"Firebase Project: {PROJECT_ID}")
print(f"API Key: {API_KEY[:10]}...")

SEED_EMAIL = 'seedadmin@omnishare.com'
SEED_PASSWORD = 'SeedAdmin@12345!'

AUTH_URL = f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}'
SIGNUP_URL = f'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}'
FIRESTORE_BASE = f'https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents'

# ─── Data ────────────────────────────────────────────────────────────

REGIONS = ['Delhi', 'Mumbai', 'Bangalore', 'Pune', 'Hyderabad',
           'Chennai', 'Kolkata', 'Jaipur', 'Indore', 'Ahmedabad']

CATEGORIES = [
    {'name': 'Electronics', 'icon': '💻', 'slug': 'electronics'},
    {'name': 'Furniture', 'icon': '🪑', 'slug': 'furniture'},
    {'name': 'Bicycles', 'icon': '🚲', 'slug': 'bicycles'},
    {'name': 'Motorcycles', 'icon': '🏍️', 'slug': 'motorcycles'},
    {'name': 'Tools & Equipment', 'icon': '🔧', 'slug': 'tools-equipment'},
    {'name': 'Party & Event', 'icon': '🎉', 'slug': 'party-event'},
    {'name': 'Sports & Outdoors', 'icon': '⚽', 'slug': 'sports-outdoors'},
    {'name': 'Photography', 'icon': '📷', 'slug': 'photography'},
    {'name': 'Gaming', 'icon': '🎮', 'slug': 'gaming'},
    {'name': 'Home & Kitchen', 'icon': '🏠', 'slug': 'home-kitchen'},
]

LISTINGS_BY_CATEGORY = {
    'Electronics': [
        {'title': 'MacBook Pro 15" 2021', 'price': 150, 'deposit': 500},
        {'title': 'Dell Laptop XPS 13', 'price': 100, 'deposit': 400},
        {'title': 'Sony A6400 Camera', 'price': 200, 'deposit': 800},
        {'title': 'Canon EOS R5', 'price': 250, 'deposit': 1000},
        {'title': 'DJI Air 2S Drone', 'price': 300, 'deposit': 1200},
        {'title': 'iPad Pro 12.9"', 'price': 80, 'deposit': 300},
        {'title': 'LG 4K Projector', 'price': 200, 'deposit': 800},
        {'title': 'Gaming Laptop RTX 4090', 'price': 400, 'deposit': 2000},
    ],
    'Furniture': [
        {'title': 'Premium Leather Sofa', 'price': 80, 'deposit': 2000},
        {'title': 'Dining Table Set 6 Seater', 'price': 60, 'deposit': 1500},
        {'title': 'King Size Bed Frame', 'price': 70, 'deposit': 1800},
        {'title': 'Gaming Chair Pro', 'price': 50, 'deposit': 1000},
        {'title': 'Executive Office Desk', 'price': 40, 'deposit': 800},
    ],
    'Bicycles': [
        {'title': 'Trek Mountain Bike 29"', 'price': 40, 'deposit': 800},
        {'title': 'Giant Road Bike Carbon', 'price': 50, 'deposit': 1000},
        {'title': 'BMX Stunt Bike', 'price': 25, 'deposit': 400},
        {'title': 'Hybrid City Bike', 'price': 30, 'deposit': 500},
        {'title': 'Electric Assist Bike', 'price': 80, 'deposit': 2000},
    ],
    'Motorcycles': [
        {'title': 'Honda CB Shine SP', 'price': 120, 'deposit': 5000},
        {'title': 'Royal Enfield Classic 350', 'price': 130, 'deposit': 5500},
        {'title': 'TVS Apache RTR 200', 'price': 110, 'deposit': 4500},
        {'title': 'KTM Duke 390', 'price': 150, 'deposit': 6500},
        {'title': 'Yamaha R15 V4', 'price': 135, 'deposit': 5800},
    ],
    'Tools & Equipment': [
        {'title': 'Bosch Power Drill Set', 'price': 60, 'deposit': 1500},
        {'title': 'Makita Circular Saw', 'price': 80, 'deposit': 2000},
        {'title': 'DeWalt Combo Kit 20V', 'price': 100, 'deposit': 2500},
        {'title': 'Pressure Washer 3000 PSI', 'price': 90, 'deposit': 2200},
        {'title': 'Welding Machine AC/DC', 'price': 150, 'deposit': 4000},
    ],
    'Party & Event': [
        {'title': 'DJ Mixer Setup', 'price': 200, 'deposit': 5000},
        {'title': 'LED Lighting Pack 100 PCS', 'price': 80, 'deposit': 1500},
        {'title': 'Sound System 1000W', 'price': 150, 'deposit': 3000},
        {'title': 'Party Tent 20x20', 'price': 250, 'deposit': 5000},
        {'title': 'Laser Lighting Show System', 'price': 180, 'deposit': 4000},
    ],
    'Sports & Outdoors': [
        {'title': 'Camping Tent 4 Person', 'price': 50, 'deposit': 1000},
        {'title': 'Trekking Backpack 60L', 'price': 40, 'deposit': 800},
        {'title': 'Dumbbell Set 100 KG', 'price': 80, 'deposit': 2000},
        {'title': 'Cricket Kit Full Set', 'price': 45, 'deposit': 900},
        {'title': 'Kayak Single Seater', 'price': 120, 'deposit': 3000},
    ],
    'Photography': [
        {'title': 'Canon EF 70-200mm Lens', 'price': 80, 'deposit': 2000},
        {'title': 'Tripod Carbon Fiber', 'price': 40, 'deposit': 800},
        {'title': 'Ring Light 18" with Stand', 'price': 50, 'deposit': 1000},
        {'title': 'Gimbal 3-Axis Stabilizer', 'price': 100, 'deposit': 2500},
        {'title': 'Drone 4K Aerial', 'price': 250, 'deposit': 6000},
    ],
    'Gaming': [
        {'title': 'PS5 Console', 'price': 180, 'deposit': 4000},
        {'title': 'Xbox Series X', 'price': 170, 'deposit': 3800},
        {'title': 'Nintendo Switch OLED', 'price': 120, 'deposit': 2500},
        {'title': 'VR Headset Meta Quest 3', 'price': 200, 'deposit': 5000},
        {'title': 'Gaming PC RTX 4080', 'price': 400, 'deposit': 10000},
    ],
    'Home & Kitchen': [
        {'title': 'Microwave Oven 30L', 'price': 50, 'deposit': 1200},
        {'title': 'Air Fryer 8L Digital', 'price': 60, 'deposit': 1500},
        {'title': 'Vacuum Cleaner Robot', 'price': 80, 'deposit': 2000},
        {'title': 'OLED TV 55"', 'price': 200, 'deposit': 5000},
        {'title': 'Coffee Maker Espresso', 'price': 35, 'deposit': 600},
    ],
}

DESCRIPTIONS = {
    'Electronics': 'Mint condition, fully functional. Includes original box and charger.',
    'Furniture': 'Excellent condition, clean and well-maintained. Pet and smoke-free home.',
    'Bicycles': 'Well-maintained, serviced regularly. Great for daily commute or recreation.',
    'Motorcycles': 'Excellent running condition, regular maintenance done. Full insurance available.',
    'Tools & Equipment': 'Professional grade, tested and verified. Perfect for projects.',
    'Party & Event': 'Recently serviced, all equipment working perfectly. Easy setup.',
    'Sports & Outdoors': 'Premium quality, used minimally. Great for adventure enthusiasts.',
    'Photography': 'Professional equipment in excellent condition. Includes carrying case.',
    'Gaming': 'Brand new or like-new condition. Latest model with all original accessories.',
    'Home & Kitchen': 'Energy efficient and reliable. Perfect for daily use.',
}


# ─── Helpers ─────────────────────────────────────────────────────────

def to_firestore_value(val):
    """Convert a Python value to Firestore REST API Value format."""
    if isinstance(val, str):
        return {'stringValue': val}
    elif isinstance(val, bool):
        return {'booleanValue': val}
    elif isinstance(val, int):
        return {'integerValue': str(val)}
    elif isinstance(val, float):
        return {'doubleValue': val}
    elif val is None:
        return {'nullValue': None}
    elif isinstance(val, dict):
        return {'mapValue': {'fields': {k: to_firestore_value(v) for k, v in val.items()}}}
    elif isinstance(val, list):
        return {'arrayValue': {'values': [to_firestore_value(v) for v in val]}}
    return {'stringValue': str(val)}


def to_firestore_fields(data: dict):
    """Convert a flat dict to Firestore fields format."""
    return {k: to_firestore_value(v) for k, v in data.items()}


def firebase_auth(email, password, signup=False):
    """Sign in or sign up via Firebase Auth REST API. Returns id_token."""
    url = SIGNUP_URL if signup else AUTH_URL
    payload = {'email': email, 'password': password, 'returnSecureToken': True}
    r = requests.post(url, json=payload)
    if r.status_code == 200:
        return r.json()['idToken']
    return None


def write_document(collection, doc_id, data, token):
    """Write a single document to Firestore via REST API."""
    url = f'{FIRESTORE_BASE}/{collection}/{doc_id}'
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    body = {'fields': to_firestore_fields(data)}
    r = requests.patch(url, json=body, headers=headers)
    if r.status_code not in (200, 201):
        raise Exception(f'Write failed ({r.status_code}): {r.text[:200]}')
    return True


def batch_write(writes, token):
    """Commit a batch of writes via Firestore REST API (max 500 per batch)."""
    url = f'https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:commit'
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    batch_writes = []
    for collection, doc_id, data in writes:
        doc_path = f'projects/{PROJECT_ID}/databases/(default)/documents/{collection}/{doc_id}'
        batch_writes.append({
            'update': {
                'name': doc_path,
                'fields': to_firestore_fields(data)
            }
        })

    body = {'writes': batch_writes}
    r = requests.post(url, json=body, headers=headers)
    if r.status_code not in (200, 201):
        raise Exception(f'Batch write failed ({r.status_code}): {r.text[:300]}')
    return True


# ─── Main ────────────────────────────────────────────────────────────

def seed():
    print('\n🚀 Starting Firestore seeding via REST API...\n')

    # 1) Authenticate
    print('🔐 Authenticating...')
    token = firebase_auth(SEED_EMAIL, SEED_PASSWORD)
    if not token:
        print('   User not found, creating account...')
        token = firebase_auth(SEED_EMAIL, SEED_PASSWORD, signup=True)
    if not token:
        print('❌ Authentication failed. Check API key and credentials.')
        sys.exit(1)
    print(f'   ✓ Authenticated as {SEED_EMAIL}')

    # 2) Seed categories
    print('📁 Seeding categories...')
    for cat in CATEGORIES:
        write_document('categories', cat['slug'], {
            'name': cat['name'],
            'slug': cat['slug'],
            'icon': cat['icon'],
            'createdAt': datetime.utcnow().isoformat() + 'Z',
        }, token)
    print(f'   ✓ {len(CATEGORIES)} categories written')

    # 3) Seed host users
    print('👤 Seeding host users...')
    hosts = []
    for i in range(1, 26):
        uid = f'host_{i}'
        write_document('users', uid, {
            'uid': uid,
            'username': uid,
            'email': f'host{i}@omnishare.com',
            'firstName': 'Host',
            'lastName': str(i),
            'role': 'host',
            'kycStatus': 'verified',
            'phoneNumber': f'98{random.randint(10000000, 99999999)}',
            'trustScore': round(random.uniform(4.0, 5.0), 2),
            'goldHostFlag': random.random() > 0.25,
            'totalBookings': random.randint(10, 120),
            'successfulBookings': random.randint(5, 100),
            'cancelledBookings': random.randint(0, 5),
            'disputedBookings': random.randint(0, 2),
            'createdAt': datetime.utcnow().isoformat() + 'Z',
            'updatedAt': datetime.utcnow().isoformat() + 'Z',
        }, token)
        hosts.append(uid)
    print(f'   ✓ {len(hosts)} host users written')

    # 4) Seed listings (use batch writes for speed)
    print('📦 Seeding listings...')
    listing_count = 0
    batch = []

    for cat in CATEGORIES:
        items = LISTINGS_BY_CATEGORY.get(cat['name'], [])
        for region in REGIONS:
            for item in items:
                copies = random.randint(1, 2)
                for _ in range(copies):
                    listing_count += 1
                    listing_id = f'listing_{listing_count}'
                    daily_price = item['price'] + random.randint(-10, 10)
                    rating = round(random.uniform(3.5, 5.0), 2)

                    listing_data = {
                        'title': item['title'],
                        'description': DESCRIPTIONS.get(cat['name'], ''),
                        'category': cat['name'],
                        'categorySlug': cat['slug'],
                        'dailyPrice': max(daily_price, item['price']),
                        'deposit': item['deposit'] + random.randint(-200, 200),
                        'location': region,
                        'host': random.choice(hosts),
                        'rating': rating,
                        'totalReviews': random.randint(1, 50),
                        'totalBookings': random.randint(0, 50),
                        'isAvailable': True,
                        'verificationStatus': 'approved',
                        'promotedFlag': random.random() < 0.3,
                        'createdAt': datetime.utcnow().isoformat() + 'Z',
                        'updatedAt': datetime.utcnow().isoformat() + 'Z',
                    }

                    batch.append(('listings', listing_id, listing_data))

                    # Firestore batch limit = 500
                    if len(batch) >= 450:
                        batch_write(batch, token)
                        print(f'   ... committed {listing_count} listings so far')
                        batch = []

                        # Refresh token every ~1000 writes (tokens expire after 1hr)
                        if listing_count % 1000 == 0:
                            token = firebase_auth(SEED_EMAIL, SEED_PASSWORD) or token

    # Commit remaining
    if batch:
        batch_write(batch, token)
    print(f'   ✓ {listing_count} listings written')

    print(f'\n✅ Firestore seeding completed!')
    print(f'   Categories: {len(CATEGORIES)}')
    print(f'   Users: {len(hosts)}')
    print(f'   Listings: {listing_count}')
    print(f'\nCheck your Firebase Console to see the data.\n')


if __name__ == '__main__':
    seed()
