from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

from listings.models import Category, Listing

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed 25 approved demo listings with prices between Rs.10 and Rs.100.'

    def handle(self, *args, **options):
        host, _ = User.objects.get_or_create(
            username='demo_price_host',
            defaults={
                'email': 'demo_price_host@omnishare.local',
                'role': 'host',
                'kyc_status': 'verified',
                'trust_score': 4.8,
            },
        )

        if host.kyc_status != 'verified':
            host.kyc_status = 'verified'
            host.role = 'host'
            host.save(update_fields=['kyc_status', 'role'])

        cat, _ = Category.objects.get_or_create(
            name='Budget Rentals',
            defaults={
                'description': 'Affordable demo listings for UI and booking tests',
                'icon': 'fas fa-tag',
            },
        )

        today = timezone.now().date()
        availability_end = today + timedelta(days=90)

        base_titles = [
            'Budget Camera',
            'Study Chair',
            'Travel Backpack',
            'Mini Tripod',
            'Bluetooth Speaker',
            'Desk Lamp',
            'Power Bank',
            'Gaming Mouse',
            'Cycling Helmet',
            'Yoga Mat',
            'Portable Fan',
            'Microphone Kit',
            'Kitchen Mixer',
            'Camping Lantern',
            'Hand Drill',
            'Action Camera',
            'Compact Projector',
            'Car Vacuum',
            'Wireless Keyboard',
            'Bean Bag',
            'Sketch Tablet',
            'Mini Printer',
            'Travel Trolley',
            'Electric Kettle',
            'Folding Table',
        ]

        prices = [10, 12, 15, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]

        created = []
        for idx, (title, price) in enumerate(zip(base_titles, prices), start=1):
            listing, was_created = Listing.objects.update_or_create(
                host=host,
                title=f'{title} #{idx}',
                defaults={
                    'description': f'{title} in good condition. Ideal for short-term rental tests.',
                    'category': cat,
                    'daily_price': Decimal(str(price)),
                    'deposit': Decimal(str(max(10, price * 2))),
                    'location': f'Demo City {((idx - 1) % 5) + 1}',
                    'availability_start': today,
                    'availability_end': availability_end,
                    'is_available': True,
                    'verification_status': 'approved',
                    'rating': Decimal('4.50'),
                    'total_reviews': 0,
                    'total_bookings': 0,
                    'promoted_flag': False,
                },
            )
            created.append((listing, was_created))

        self.stdout.write(self.style.SUCCESS('Seeded 25 listings in Rs.10-Rs.100 range:'))
        for listing, was_created in created:
            status = 'created' if was_created else 'updated'
            self.stdout.write(f'- [{status}] {listing.title} | Rs.{listing.daily_price}/day | {listing.location}')
