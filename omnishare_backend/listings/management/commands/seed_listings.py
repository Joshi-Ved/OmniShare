from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta
from listings.models import Category, Listing
import random
import firebase_admin
from firebase_admin import credentials, firestore

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with realistic listing data across Indian regions'

    # Data for seed
    REGIONS = [
        {'name': 'Delhi', 'lat': 28.6139, 'lon': 77.2090},
        {'name': 'Mumbai', 'lat': 19.0760, 'lon': 72.8777},
        {'name': 'Bangalore', 'lat': 12.9716, 'lon': 77.5946},
        {'name': 'Pune', 'lat': 18.5204, 'lon': 73.8567},
        {'name': 'Hyderabad', 'lat': 17.3850, 'lon': 78.4867},
        {'name': 'Chennai', 'lat': 13.0827, 'lon': 80.2707},
        {'name': 'Kolkata', 'lat': 22.5726, 'lon': 88.3639},
        {'name': 'Jaipur', 'lat': 26.9124, 'lon': 75.7873},
        {'name': 'Indore', 'lat': 22.7196, 'lon': 75.8577},
        {'name': 'Ahmedabad', 'lat': 23.0225, 'lon': 72.5714},
    ]

    CATEGORIES_DATA = [
        {'name': 'Electronics', 'icon': 'fas fa-laptop', 'description': 'Laptops, cameras, projectors, etc.'},
        {'name': 'Furniture', 'icon': 'fas fa-chair', 'description': 'Sofa, tables, beds, cabinets, etc.'},
        {'name': 'Bicycles', 'icon': 'fas fa-bicycle', 'description': 'Mountain bikes, road bikes, etc.'},
        {'name': 'Motorcycles', 'icon': 'fas fa-motorcycle', 'description': 'Bikes, scooters, etc.'},
        {'name': 'Tools & Equipment', 'icon': 'fas fa-wrench', 'description': 'Power tools, drills, etc.'},
        {'name': 'Party & Event', 'icon': 'fas fa-champagne-glasses', 'description': 'Decorations, speakers, lights, etc.'},
        {'name': 'Sports & Outdoors', 'icon': 'fas fa-dumbbell', 'description': 'Camping, fitness, sports gear.'},
        {'name': 'Photography', 'icon': 'fas fa-camera', 'description': 'Cameras, lenses, tripods, lighting.'},
        {'name': 'Gaming', 'icon': 'fas fa-gamepad', 'description': 'Consoles, VR headsets, gaming PCs.'},
        {'name': 'Home & Kitchen', 'icon': 'fas fa-kitchen-set', 'description': 'Appliances, cookware, etc.'},
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
            {'title': 'Epson Home Projector', 'price': 150, 'deposit': 600},
            {'title': 'Sony Mirrorless Camera', 'price': 180, 'deposit': 700},
            {'title': 'Nikon Z6 Camera', 'price': 220, 'deposit': 900},
            {'title': 'Go Pro Hero 11', 'price': 120, 'deposit': 400},
            {'title': 'DJI Mini 3 Pro', 'price': 250, 'deposit': 1000},
            {'title': 'Gaming Laptop RTX 4090', 'price': 400, 'deposit': 2000},
            {'title': 'iMac 24" 2023', 'price': 350, 'deposit': 1500},
            {'title': 'Sony A7R V', 'price': 300, 'deposit': 1200},
        ],
        'Furniture': [
            {'title': 'Premium Leather Sofa', 'price': 80, 'deposit': 2000},
            {'title': 'Dining Table Set 6 seater', 'price': 60, 'deposit': 1500},
            {'title': 'King Size Bed Frame', 'price': 70, 'deposit': 1800},
            {'title': 'Gaming Chair Pro', 'price': 50, 'deposit': 1000},
            {'title': 'Executive Office Desk', 'price': 40, 'deposit': 800},
            {'title': 'TV Stand 65"', 'price': 30, 'deposit': 500},
            {'title': 'Bookshelf Storage 5 tier', 'price': 35, 'deposit': 700},
            {'title': 'Sectional Corner Sofa', 'price': 100, 'deposit': 2500},
            {'title': 'Wardrobe With Mirror', 'price': 45, 'deposit': 900},
            {'title': 'Study Table With Shelves', 'price': 35, 'deposit': 600},
            {'title': 'Reclining Chair Leather', 'price': 55, 'deposit': 1200},
            {'title': 'Bed with Drawer Storage', 'price': 65, 'deposit': 1600},
            {'title': 'Modular Kitchen Cabinet', 'price': 80, 'deposit': 2000},
            {'title': 'Display Showcase', 'price': 40, 'deposit': 800},
            {'title': 'Coffee Table Set', 'price': 25, 'deposit': 400},
        ],
        'Bicycles': [
            {'title': 'Trek Mountain Bike 29"', 'price': 40, 'deposit': 800},
            {'title': 'Giant Road Bike Carbon', 'price': 50, 'deposit': 1000},
            {'title': 'BMX Stunt Bike', 'price': 25, 'deposit': 400},
            {'title': 'Hybrid City Bike', 'price': 30, 'deposit': 500},
            {'title': 'Specialized MTB Pro', 'price': 45, 'deposit': 900},
            {'title': 'Hero Cycle Professional', 'price': 20, 'deposit': 300},
            {'title': 'Electric Assist Bike', 'price': 80, 'deposit': 2000},
            {'title': 'Fixed Gear Bike', 'price': 35, 'deposit': 600},
            {'title': 'Foldable City Bike', 'price': 28, 'deposit': 450},
            {'title': 'Cargo Bike Heavy Duty', 'price': 55, 'deposit': 1100},
        ],
        'Motorcycles': [
            {'title': 'Honda CB Shine SP', 'price': 120, 'deposit': 5000},
            {'title': 'Bajaj Dominar 250', 'price': 140, 'deposit': 6000},
            {'title': 'Royal Enfield Classic 350', 'price': 130, 'deposit': 5500},
            {'title': 'TVS Apache RTR 200', 'price': 110, 'deposit': 4500},
            {'title': 'Hero Splendor Plus', 'price': 80, 'deposit': 3000},
            {'title': 'KTM Duke 390', 'price': 150, 'deposit': 6500},
            {'title': 'Yamaha R15 V4', 'price': 135, 'deposit': 5800},
            {'title': 'Suzuki Gixxer SF', 'price': 125, 'deposit': 5200},
            {'title': 'Honda CB Hornet 160R', 'price': 115, 'deposit': 4800},
            {'title': 'Bajaj Avenger 220', 'price': 105, 'deposit': 4200},
        ],
        'Tools & Equipment': [
            {'title': 'Bosch Power Drill Set', 'price': 60, 'deposit': 1500},
            {'title': 'Makita Circular Saw', 'price': 80, 'deposit': 2000},
            {'title': 'DeWalt Combo Kit 20V', 'price': 100, 'deposit': 2500},
            {'title': 'Angle Grinder 9"', 'price': 50, 'deposit': 1000},
            {'title': 'Impact Driver Professional', 'price': 70, 'deposit': 1800},
            {'title': 'Jigsaw Precision Cut', 'price': 55, 'deposit': 1200},
            {'title': 'Pressure Washer 3000 PSI', 'price': 90, 'deposit': 2200},
            {'title': 'Air Compressor 2HP', 'price': 75, 'deposit': 1600},
            {'title': 'Welding Machine AC/DC', 'price': 150, 'deposit': 4000},
            {'title': 'Table Saw Industrial', 'price': 200, 'deposit': 5000},
        ],
        'Party & Event': [
            {'title': 'DJ Mixer Setup', 'price': 200, 'deposit': 5000},
            {'title': 'LED Lighting Pack 100 PCS', 'price': 80, 'deposit': 1500},
            {'title': 'Sound System 1000W', 'price': 150, 'deposit': 3000},
            {'title': 'Microphone & Speakers Set', 'price': 100, 'deposit': 2000},
            {'title': 'Projector Screen 120"', 'price': 120, 'deposit': 2500},
            {'title': 'Party Tent 20x20', 'price': 250, 'deposit': 5000},
            {'title': 'Fog Machine Professional', 'price': 60, 'deposit': 1200},
            {'title': 'Stage Light Par 64', 'price': 40, 'deposit': 800},
            {'title': 'Laser Lighting Show System', 'price': 180, 'deposit': 4000},
            {'title': 'Karaoke Microphone System', 'price': 90, 'deposit': 1800},
        ],
        'Sports & Outdoors': [
            {'title': 'Camping Tent 4 Person', 'price': 50, 'deposit': 1000},
            {'title': 'Trekking Backpack 60L', 'price': 40, 'deposit': 800},
            {'title': 'Dumbbell Set 100 KG', 'price': 80, 'deposit': 2000},
            {'title': 'Yoga Mat Premium', 'price': 15, 'deposit': 200},
            {'title': 'Tennis Racquet Professional', 'price': 35, 'deposit': 600},
            {'title': 'Cricket Kit Full Set', 'price': 45, 'deposit': 900},
            {'title': 'Football & Goal Posts', 'price': 60, 'deposit': 1200},
            {'title': 'Badminton Set Net', 'price': 25, 'deposit': 400},
            {'title': 'Kayak Single Seater', 'price': 120, 'deposit': 3000},
            {'title': 'Skateboard Professional', 'price': 30, 'deposit': 500},
        ],
        'Photography': [
            {'title': 'Canon EF 70-200mm Lens', 'price': 80, 'deposit': 2000},
            {'title': 'Sigma 24-70mm f/2.8 Art', 'price': 100, 'deposit': 2500},
            {'title': 'Tripod Carbon Fiber 4 Section', 'price': 40, 'deposit': 800},
            {'title': 'Ring Light 18" with Stand', 'price': 50, 'deposit': 1000},
            {'title': 'Softbox Studio Light Kit', 'price': 120, 'deposit': 2500},
            {'title': 'Backdrop Stand Adjustable', 'price': 30, 'deposit': 500},
            {'title': 'Memory Card 1TB SSD', 'price': 25, 'deposit': 400},
            {'title': 'Flash Speedlight Professional', 'price': 70, 'deposit': 1500},
            {'title': 'Gimbal 3-Axis Stabilizer', 'price': 100, 'deposit': 2500},
            {'title': 'Drone 4K Aerial', 'price': 250, 'deposit': 6000},
        ],
        'Gaming': [
            {'title': 'PS5 Console', 'price': 180, 'deposit': 4000},
            {'title': 'Xbox Series X', 'price': 170, 'deposit': 3800},
            {'title': 'Nintendo Switch OLED', 'price': 120, 'deposit': 2500},
            {'title': 'VR Headset Meta Quest 3', 'price': 200, 'deposit': 5000},
            {'title': 'Gaming PC RTX 4080', 'price': 400, 'deposit': 10000},
            {'title': 'Gaming Monitor 240Hz 27"', 'price': 90, 'deposit': 2000},
            {'title': 'Gaming Keyboard Mechanical', 'price': 40, 'deposit': 800},
            {'title': 'Gaming Mouse Pro', 'price': 30, 'deposit': 500},
            {'title': 'Racing Simulator Setup', 'price': 250, 'deposit': 6000},
            {'title': 'Gaming Headset Wireless', 'price': 50, 'deposit': 1000},
        ],
        'Home & Kitchen': [
            {'title': 'Microwave Oven 30L', 'price': 50, 'deposit': 1200},
            {'title': 'Pressure Cooker Instant Pot', 'price': 45, 'deposit': 900},
            {'title': 'Mixer Grinder 1000W', 'price': 55, 'deposit': 1000},
            {'title': 'Air Fryer 8L Digital', 'price': 60, 'deposit': 1500},
            {'title': 'Vacuum Cleaner Robot', 'price': 80, 'deposit': 2000},
            {'title': 'Washing Machine 7KG', 'price': 120, 'deposit': 3000},
            {'title': 'Refrigerator Double Door', 'price': 150, 'deposit': 4000},
            {'title': 'OLED TV 55"', 'price': 200, 'deposit': 5000},
            {'title': 'Coffee Maker Espresso', 'price': 35, 'deposit': 600},
            {'title': 'Dishwasher Automatic', 'price': 100, 'deposit': 2500},
        ],
    }

    DESCRIPTIONS = {
        'Electronics': 'Mint condition, fully functional. Includes original box and charger.',
        'Furniture': 'Excellent condition, clean and well-maintained. Pet and smoke-free home.',
        'Bicycles': 'Well-maintained, serviced regularly. Great for daily commute or recreation.',
        'Motorcycles': 'Excellent running condition, regular maintenance done. Full insurance available.',
        'Tools & Equipment': 'Professional grade, tested and verified. Perfect for projects and contractors.',
        'Party & Event': 'Recently serviced, all equipment working perfectly. Easy setup and operation.',
        'Sports & Outdoors': 'Premium quality, used minimally. Great for adventure enthusiasts.',
        'Photography': 'Professional equipment in excellent condition. Includes warranty.',
        'Gaming': 'Brand new or like-new condition. Latest model with all original accessories.',
        'Home & Kitchen': 'Energy efficient and reliable. Perfect for daily use and entertaining.',
    }

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting seed data generation...'))

        try:
            # Step 1: Create Categories
            categories = self.create_categories()
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(categories)} categories'))

            # Step 2: Create Host Users
            hosts = self.create_hosts()
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(hosts)} host users'))

            # Step 3: Create Listings
            listings_count = self.create_listings(categories, hosts)
            self.stdout.write(self.style.SUCCESS(f'✓ Created {listings_count} listings'))

            # Step 4: Sync to Firebase
            self.sync_to_firebase(hosts)
            self.stdout.write(self.style.SUCCESS('✓ Synced data to Firebase Firestore'))

            self.stdout.write(self.style.SUCCESS('\n✅ Seed data generation completed successfully!'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error during seeding: {str(e)}'))
            import traceback
            traceback.print_exc()

    def create_categories(self):
        """Create listing categories"""
        categories = []
        for cat_data in self.CATEGORIES_DATA:
            cat, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={
                    'description': cat_data['description'],
                    'icon': cat_data['icon'],
                }
            )
            categories.append(cat)
        return categories

    def create_hosts(self):
        """Create verified host users"""
        hosts = []
        for i in range(25):  # Create 25 host users
            username = f'host_{i+1}'
            email = f'host{i+1}@omnishare.com'
            
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': f'Host {i+1}',
                    'last_name': 'OmniShare',
                    'role': 'host',
                    'kyc_status': 'verified',  # Set to verified so listings are bookable
                    'phone_number': f'98{random.randint(10000000, 99999999)}',
                    'trust_score': round(random.uniform(4.0, 5.0), 2),
                    'gold_host_flag': random.choice([True, True, True, False]),  # 75% gold hosts
                    'successful_bookings': random.randint(5, 100),
                }
            )
            if created:
                user.set_password('password123')
                user.save()
            hosts.append(user)
        return hosts

    def create_listings(self, categories, hosts):
        """Create listings across regions and categories"""
        listings_count = 0

        for category in categories:
            cat_name = category.name
            if cat_name not in self.LISTINGS_BY_CATEGORY:
                continue

            items = self.LISTINGS_BY_CATEGORY[cat_name]
            
            # Create multiple listings of each type across regions
            for region in self.REGIONS:
                for item in items:
                    # Create 2-3 listings of same item in region
                    for copy in range(random.randint(2, 3)):
                        host = random.choice(hosts)
                        
                        # Randomize price slightly
                        daily_price = item['price'] + random.randint(-10, 10)
                        deposit = item['deposit'] + random.randint(-200, 200)
                        
                        # Randomize availability
                        availability_start = timezone.now().date()
                        availability_end = availability_start + timedelta(days=random.randint(30, 365))
                        
                        # Create listing
                        listing, created = Listing.objects.get_or_create(
                            host=host,
                            title=f"{item['title']} - Copy {copy+1}",
                            category=category,
                            location=region['name'],
                            defaults={
                                'description': self.DESCRIPTIONS.get(cat_name, 'Great item for rent!'),
                                'daily_price': daily_price,
                                'deposit': deposit,
                                'latitude': region['lat'] + random.uniform(-0.5, 0.5),
                                'longitude': region['lon'] + random.uniform(-0.5, 0.5),
                                'address': f"Area {random.randint(1, 20)}, {region['name']}, India",
                                'availability_start': availability_start,
                                'availability_end': availability_end,
                                'is_available': True,
                                'verification_status': 'approved',  # Auto-approve for demo
                                'rating': round(random.uniform(3.5, 5.0), 2),
                                'total_reviews': random.randint(1, 50),
                                'total_bookings': random.randint(0, 50),
                                'promoted_flag': random.choice([True, False, False]),
                            }
                        )
                        if created:
                            listings_count += 1

        return listings_count

    def sync_to_firebase(self, hosts):
        """Sync user data to Firebase Firestore"""
        try:
            # Initialize Firebase Admin SDK if available
            if not firebase_admin._apps:
                # Try to initialize - it will fail gracefully if no credentials
                try:
                    from omnishare_backend.settings import FIREBASE_CREDENTIALS_PATH
                    credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
                    firebase_admin.initialize_app()
                except:
                    self.stdout.write(self.style.WARNING('Firebase Firestore sync skipped - credentials not configured'))
                    return

            db = firestore.client()
            
            # Sync host data to Firestore
            for host in hosts:
                db.collection('users').document(host.username).set({
                    'uid': host.username,
                    'email': host.email,
                    'username': host.username,
                    'firstName': host.first_name,
                    'lastName': host.last_name,
                    'role': host.role,
                    'kycStatus': host.kyc_status,
                    'trustScore': float(host.trust_score),
                    'goldHostFlag': host.gold_host_flag,
                    'successfulBookings': host.successful_bookings,
                    'createdAt': timezone.now().isoformat(),
                }, merge=True)
                
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Firebase sync warning: {str(e)}'))
