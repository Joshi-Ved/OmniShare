"""
CRM Analytics and Reporting
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from datetime import timedelta

from users.models import User
from listings.models import Listing
from bookings.models import Booking
from payments.models import Transaction
from users.permissions import IsAdmin


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def dashboard_analytics(request):
    """Get comprehensive dashboard analytics"""
    
    # User Stats
    total_users = User.objects.count()
    verified_users = User.objects.filter(kyc_status='verified').count()
    gold_hosts = User.objects.filter(gold_host_flag=True).count()
    
    # Listing Stats
    total_listings = Listing.objects.count()
    verified_listings = Listing.objects.filter(verification_status='approved').count()
    pending_listings = Listing.objects.filter(verification_status='pending').count()
    
    # Booking Stats
    total_bookings = Booking.objects.count()
    completed_bookings = Booking.objects.filter(booking_status='completed').count()
    active_bookings = Booking.objects.filter(booking_status__in=['confirmed', 'in_use']).count()
    disputed_bookings = Booking.objects.filter(dispute_flag=True).count()
    
    # Revenue Stats
    total_revenue = Booking.objects.filter(
        booking_status='completed'
    ).aggregate(
        total=Sum('platform_commission')
    )['total'] or 0
    
    # Monthly GMV (Gross Merchandise Value)
    thirty_days_ago = timezone.now() - timedelta(days=30)
    monthly_gmv = Booking.objects.filter(
        created_at__gte=thirty_days_ago,
        booking_status='completed'
    ).aggregate(
        total=Sum('rental_amount')
    )['total'] or 0
    
    # Category Performance
    category_stats = Listing.objects.values(
        'category__name'
    ).annotate(
        listing_count=Count('id'),
        avg_rating=Avg('rating'),
        total_bookings=Count('bookings')
    ).order_by('-total_bookings')[:5]
    
    # Top Hosts
    top_hosts = User.objects.filter(
        role__in=['host', 'both']
    ).annotate(
        total_earnings=Sum('host_bookings__host_payout')
    ).order_by('-total_earnings')[:5]
    
    top_hosts_data = [{
        'id': host.id,
        'username': host.username,
        'total_earnings': float(host.total_earnings or 0),
        'trust_score': float(host.trust_score),
        'gold_host': host.gold_host_flag
    } for host in top_hosts]
    
    return Response({
        'users': {
            'total': total_users,
            'verified': verified_users,
            'gold_hosts': gold_hosts
        },
        'listings': {
            'total': total_listings,
            'verified': verified_listings,
            'pending': pending_listings
        },
        'bookings': {
            'total': total_bookings,
            'completed': completed_bookings,
            'active': active_bookings,
            'disputed': disputed_bookings
        },
        'revenue': {
            'total_platform_revenue': float(total_revenue),
            'monthly_gmv': float(monthly_gmv)
        },
        'category_performance': list(category_stats),
        'top_hosts': top_hosts_data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def revenue_report(request):
    """Get detailed revenue report"""
    from datetime import datetime
    
    # Get date range from query params
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')
    
    if start_date_str and end_date_str:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
    else:
        # Default to last 30 days
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
    
    bookings = Booking.objects.filter(
        completed_at__gte=start_date,
        completed_at__lte=end_date,
        booking_status='completed'
    )
    
    total_commission = bookings.aggregate(Sum('platform_commission'))['platform_commission__sum'] or 0
    total_gmv = bookings.aggregate(Sum('rental_amount'))['rental_amount__sum'] or 0
    booking_count = bookings.count()
    
    return Response({
        'start_date': start_date,
        'end_date': end_date,
        'total_bookings': booking_count,
        'total_gmv': float(total_gmv),
        'total_commission': float(total_commission),
        'commission_rate': '18%',
        'average_booking_value': float(total_gmv / booking_count) if booking_count > 0 else 0
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def user_analytics(request):
    """Get user behavior analytics"""
    
    # User acquisition trend
    thirty_days_ago = timezone.now() - timedelta(days=30)
    new_users = User.objects.filter(created_at__gte=thirty_days_ago).count()
    
    # User by role
    user_by_role = User.objects.values('role').annotate(count=Count('id'))
    
    # Average trust score
    avg_trust_score = User.objects.aggregate(Avg('trust_score'))['trust_score__avg'] or 0
    
    # Active users (made booking in last 30 days)
    active_users = User.objects.filter(
        Q(guest_bookings__created_at__gte=thirty_days_ago) |
        Q(host_bookings__created_at__gte=thirty_days_ago)
    ).distinct().count()
    
    return Response({
        'new_users_last_30_days': new_users,
        'user_by_role': list(user_by_role),
        'average_trust_score': float(avg_trust_score),
        'active_users': active_users
    })
