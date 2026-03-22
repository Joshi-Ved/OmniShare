"""
CRM + ERP analytics and reporting endpoints.
Covers:
- Customer management
- Sales reporting
- Inventory linkage
- Decision-support dashboards
"""

from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Avg, Count, Sum, Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import User
from listings.models import Listing
from bookings.models import Booking
from users.permissions import IsAdmin
from payments.models import Transaction, Invoice


def _parse_date(date_str, fallback):
    if not date_str:
        return fallback
    return datetime.strptime(date_str, '%Y-%m-%d')


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def dashboard_analytics(request):
    """High-level operations dashboard."""
    total_users = User.objects.count()
    verified_users = User.objects.filter(kyc_status='verified').count()
    gold_hosts = User.objects.filter(gold_host_flag=True).count()

    total_listings = Listing.objects.count()
    verified_listings = Listing.objects.filter(verification_status='approved').count()
    active_listings = Listing.objects.filter(is_available=True, verification_status='approved').count()

    total_bookings = Booking.objects.count()
    completed_bookings = Booking.objects.filter(booking_status='completed').count()
    active_bookings = Booking.objects.filter(booking_status__in=['confirmed', 'in_use']).count()
    disputed_bookings = Booking.objects.filter(dispute_flag=True).count()

    total_revenue = Booking.objects.filter(booking_status='completed').aggregate(
        total=Sum('platform_commission')
    )['total'] or Decimal('0')

    thirty_days_ago = timezone.now() - timedelta(days=30)
    monthly_gmv = Booking.objects.filter(
        created_at__gte=thirty_days_ago,
        booking_status='completed'
    ).aggregate(total=Sum('rental_amount'))['total'] or Decimal('0')

    category_stats = Listing.objects.values('category__name').annotate(
        listing_count=Count('id'),
        avg_rating=Avg('rating'),
        total_bookings=Count('bookings')
    ).order_by('-total_bookings')[:8]

    top_hosts = User.objects.filter(role__in=['host', 'both']).annotate(
        total_earnings=Sum('host_bookings__host_payout'),
        completed_bookings=Count('host_bookings', filter=Q(host_bookings__booking_status='completed')),
    ).order_by('-total_earnings')[:10]

    return Response({
        'users': {
            'total': total_users,
            'verified': verified_users,
            'gold_hosts': gold_hosts,
        },
        'listings': {
            'total': total_listings,
            'verified': verified_listings,
            'active': active_listings,
        },
        'bookings': {
            'total': total_bookings,
            'completed': completed_bookings,
            'active': active_bookings,
            'disputed': disputed_bookings,
        },
        'revenue': {
            'total_platform_revenue': float(total_revenue),
            'monthly_gmv': float(monthly_gmv),
        },
        'category_performance': list(category_stats),
        'top_hosts': [
            {
                'id': host.id,
                'username': host.username,
                'total_earnings': float(host.total_earnings or 0),
                'completed_bookings': host.completed_bookings,
                'trust_score': float(host.trust_score),
                'gold_host': host.gold_host_flag,
            }
            for host in top_hosts
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def customer_management(request):
    """Extensive customer management list with filters and KPIs."""
    role = request.query_params.get('role')
    kyc = request.query_params.get('kyc_status')
    search = request.query_params.get('search')
    risk_only = request.query_params.get('risk_only') == 'true'

    users = User.objects.all().annotate(
        guest_spend=Sum('guest_bookings__guest_total', filter=Q(guest_bookings__booking_status='completed')),
        host_revenue=Sum('host_bookings__host_payout', filter=Q(host_bookings__booking_status='completed')),
        total_guest_bookings=Count('guest_bookings', distinct=True),
        total_host_bookings=Count('host_bookings', distinct=True),
        active_bookings=Count(
            'guest_bookings',
            filter=Q(guest_bookings__booking_status__in=['confirmed', 'in_use']),
            distinct=True,
        ) + Count(
            'host_bookings',
            filter=Q(host_bookings__booking_status__in=['confirmed', 'in_use']),
            distinct=True,
        ),
    )

    if role:
        users = users.filter(role=role)
    if kyc:
        users = users.filter(kyc_status=kyc)
    if search:
        users = users.filter(Q(username__icontains=search) | Q(email__icontains=search))
    if risk_only:
        users = users.filter(Q(disputed_bookings__gt=0) | Q(trust_score__lt=3.5))

    users = users.order_by('-created_at')

    return Response({
        'count': users.count(),
        'results': [
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'kyc_status': user.kyc_status,
                'trust_score': float(user.trust_score),
                'gold_host_flag': user.gold_host_flag,
                'guest_spend': float(user.guest_spend or 0),
                'host_revenue': float(user.host_revenue or 0),
                'total_guest_bookings': user.total_guest_bookings,
                'total_host_bookings': user.total_host_bookings,
                'active_bookings': user.active_bookings,
                'cancelled_bookings': user.cancelled_bookings,
                'disputed_bookings': user.disputed_bookings,
                'created_at': user.created_at,
            }
            for user in users[:200]
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def customer_detail(request, user_id):
    """Single-customer 360° profile for CRM operations."""
    user = User.objects.get(id=user_id)

    guest_bookings = Booking.objects.filter(guest=user)
    host_bookings = Booking.objects.filter(host=user)

    guest_stats = guest_bookings.aggregate(
        total=Count('id'),
        completed=Count('id', filter=Q(booking_status='completed')),
        active=Count('id', filter=Q(booking_status__in=['confirmed', 'in_use'])),
        spend=Sum('guest_total', filter=Q(booking_status='completed')),
    )

    host_stats = host_bookings.aggregate(
        total=Count('id'),
        completed=Count('id', filter=Q(booking_status='completed')),
        active=Count('id', filter=Q(booking_status__in=['confirmed', 'in_use'])),
        revenue=Sum('host_payout', filter=Q(booking_status='completed')),
    )

    recent_bookings = Booking.objects.filter(Q(guest=user) | Q(host=user)).select_related(
        'listing', 'guest', 'host'
    ).order_by('-created_at')[:10]

    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'kyc_status': user.kyc_status,
            'trust_score': float(user.trust_score),
            'gold_host_flag': user.gold_host_flag,
            'created_at': user.created_at,
        },
        'guest_stats': {
            'total_bookings': guest_stats['total'] or 0,
            'completed': guest_stats['completed'] or 0,
            'active': guest_stats['active'] or 0,
            'total_spend': float(guest_stats['spend'] or 0),
        },
        'host_stats': {
            'total_bookings': host_stats['total'] or 0,
            'completed': host_stats['completed'] or 0,
            'active': host_stats['active'] or 0,
            'total_revenue': float(host_stats['revenue'] or 0),
        },
        'recent_bookings': [
            {
                'id': booking.id,
                'listing': booking.listing.title,
                'role': 'guest' if booking.guest_id == user.id else 'host',
                'status': booking.booking_status,
                'guest_total': float(booking.guest_total),
                'host_payout': float(booking.host_payout),
                'platform_commission': float(booking.platform_commission),
                'created_at': booking.created_at,
            }
            for booking in recent_bookings
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def sales_report(request):
    """Detailed sales report with period grouping and conversion metrics."""
    end_date = _parse_date(request.query_params.get('end_date'), timezone.now())
    start_date = _parse_date(request.query_params.get('start_date'), end_date - timedelta(days=30))
    group_by = request.query_params.get('group_by', 'day')  # day/week/month

    bookings = Booking.objects.filter(created_at__gte=start_date, created_at__lte=end_date)

    completed = bookings.filter(booking_status='completed')
    cancelled = bookings.filter(booking_status='cancelled')

    totals = {
        'bookings_created': bookings.count(),
        'bookings_completed': completed.count(),
        'bookings_cancelled': cancelled.count(),
        'completion_rate': round((completed.count() / bookings.count()) * 100, 2) if bookings.exists() else 0,
        'gmv': float(completed.aggregate(v=Sum('rental_amount'))['v'] or 0),
        'guest_revenue': float(completed.aggregate(v=Sum('guest_total'))['v'] or 0),
        'host_payouts': float(completed.aggregate(v=Sum('host_payout'))['v'] or 0),
        'platform_commission': float(completed.aggregate(v=Sum('platform_commission'))['v'] or 0),
        'average_order_value': float(completed.aggregate(v=Avg('guest_total'))['v'] or 0),
    }

    if group_by == 'week':
        buckets = 7
    elif group_by == 'month':
        buckets = 30
    else:
        buckets = 1

    timeline = []
    cursor = start_date
    while cursor <= end_date:
        bucket_end = min(cursor + timedelta(days=buckets - 1), end_date)
        bucket_qs = bookings.filter(created_at__date__gte=cursor.date(), created_at__date__lte=bucket_end.date())
        bucket_completed = bucket_qs.filter(booking_status='completed')
        timeline.append({
            'label': f"{cursor.date()} to {bucket_end.date()}",
            'created': bucket_qs.count(),
            'completed': bucket_completed.count(),
            'cancelled': bucket_qs.filter(booking_status='cancelled').count(),
            'gmv': float(bucket_completed.aggregate(v=Sum('rental_amount'))['v'] or 0),
            'platform_commission': float(bucket_completed.aggregate(v=Sum('platform_commission'))['v'] or 0),
        })
        cursor = bucket_end + timedelta(days=1)

    top_categories = Listing.objects.filter(bookings__created_at__gte=start_date, bookings__created_at__lte=end_date).values(
        'category__name'
    ).annotate(
        bookings=Count('bookings'),
        gmv=Sum('bookings__rental_amount', filter=Q(bookings__booking_status='completed')),
    ).order_by('-gmv')[:10]

    return Response({
        'range': {'start_date': start_date, 'end_date': end_date, 'group_by': group_by},
        'totals': totals,
        'timeline': timeline,
        'top_categories': list(top_categories),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def inventory_linkage_report(request):
    """ERP-style inventory linkage: connects listing stock/availability to sales outcomes."""
    end_date = _parse_date(request.query_params.get('end_date'), timezone.now())
    start_date = _parse_date(request.query_params.get('start_date'), end_date - timedelta(days=30))

    listings = Listing.objects.select_related('host', 'category').annotate(
        period_bookings=Count('bookings', filter=Q(bookings__created_at__gte=start_date, bookings__created_at__lte=end_date)),
        completed_bookings=Count('bookings', filter=Q(bookings__created_at__gte=start_date, bookings__created_at__lte=end_date, bookings__booking_status='completed')),
        cancelled_bookings=Count('bookings', filter=Q(bookings__created_at__gte=start_date, bookings__created_at__lte=end_date, bookings__booking_status='cancelled')),
        active_bookings=Count('bookings', filter=Q(bookings__booking_status__in=['confirmed', 'in_use'])),
        generated_revenue=Sum('bookings__rental_amount', filter=Q(bookings__created_at__gte=start_date, bookings__created_at__lte=end_date, bookings__booking_status='completed')),
    ).order_by('-generated_revenue')

    data = []
    for listing in listings:
        utilization = 0.0
        if listing.period_bookings:
            utilization = round((listing.completed_bookings / listing.period_bookings) * 100, 2)

        inventory_risk = 'high' if (not listing.is_available or listing.verification_status != 'approved') else 'normal'
        if listing.cancelled_bookings >= 3:
            inventory_risk = 'medium'

        data.append({
            'listing_id': listing.id,
            'title': listing.title,
            'host': listing.host.username,
            'category': listing.category.name if listing.category else None,
            'verification_status': listing.verification_status,
            'is_available': listing.is_available,
            'period_bookings': listing.period_bookings,
            'completed_bookings': listing.completed_bookings,
            'cancelled_bookings': listing.cancelled_bookings,
            'active_bookings': listing.active_bookings,
            'generated_revenue': float(listing.generated_revenue or 0),
            'utilization_percent': utilization,
            'inventory_risk': inventory_risk,
        })

    totals = {
        'total_listings': len(data),
        'available_listings': sum(1 for i in data if i['is_available']),
        'high_risk_listings': sum(1 for i in data if i['inventory_risk'] == 'high'),
        'medium_risk_listings': sum(1 for i in data if i['inventory_risk'] == 'medium'),
        'total_linked_revenue': round(sum(i['generated_revenue'] for i in data), 2),
    }

    return Response({
        'range': {'start_date': start_date, 'end_date': end_date},
        'summary': totals,
        'inventory_linkage': data[:300],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def decision_support_dashboard(request):
    """Decision-support board with recommendations driven by CRM + ERP metrics."""
    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)

    booking_qs = Booking.objects.filter(created_at__gte=thirty_days_ago)
    completed_qs = booking_qs.filter(booking_status='completed')

    gmv = completed_qs.aggregate(v=Sum('rental_amount'))['v'] or Decimal('0')
    commission = completed_qs.aggregate(v=Sum('platform_commission'))['v'] or Decimal('0')
    disputes = booking_qs.filter(dispute_flag=True).count()

    low_conversion_hosts = User.objects.filter(role__in=['host', 'both']).annotate(
        total=Count('host_bookings', filter=Q(host_bookings__created_at__gte=thirty_days_ago)),
        completed=Count('host_bookings', filter=Q(host_bookings__created_at__gte=thirty_days_ago, host_bookings__booking_status='completed')),
    ).filter(total__gte=5)

    host_actions = []
    for host in low_conversion_hosts:
        conversion = (host.completed / host.total) * 100 if host.total else 0
        if conversion < 50:
            host_actions.append({
                'host_id': host.id,
                'username': host.username,
                'conversion_rate': round(conversion, 2),
                'recommended_action': 'Review listing quality, pricing, and response SLA',
            })

    underperforming_inventory = Listing.objects.annotate(
        completed_30=Count('bookings', filter=Q(bookings__created_at__gte=thirty_days_ago, bookings__booking_status='completed'))
    ).filter(verification_status='approved', is_available=True, completed_30=0)[:20]

    payment_qs = Transaction.objects.filter(created_at__gte=thirty_days_ago)
    invoice_qs = Invoice.objects.filter(created_at__gte=thirty_days_ago)

    payment_success_count = payment_qs.filter(
        transaction_type='booking_payment',
        status='success',
    ).count()
    payment_failed_count = payment_qs.filter(
        transaction_type='booking_payment',
        status='failed',
    ).count()
    refund_count = payment_qs.filter(transaction_type='refund', status='success').count()
    invoice_generated_count = invoice_qs.count()
    invoice_pdf_count = invoice_qs.filter(pdf_generated=True).count()

    sales_trend = []
    cursor = (now - timedelta(days=29)).date()
    end_cursor = now.date()
    while cursor <= end_cursor:
        day_completed = Booking.objects.filter(
            created_at__date=cursor,
            booking_status='completed',
        )
        day_payments = Transaction.objects.filter(
            created_at__date=cursor,
            transaction_type='booking_payment',
            status='success',
        )
        sales_trend.append({
            'date': cursor,
            'completed_bookings': day_completed.count(),
            'gmv': float(day_completed.aggregate(v=Sum('rental_amount'))['v'] or 0),
            'platform_commission': float(day_completed.aggregate(v=Sum('platform_commission'))['v'] or 0),
            'successful_payments': day_payments.count(),
        })
        cursor += timedelta(days=1)

    recommendations = []
    if disputes > 0:
        recommendations.append('Increase dispute monitoring and tighten host/guest handover SOPs for flagged bookings.')
    if float(commission) < 1000:
        recommendations.append('Run category-level promotions to increase GMV and commission throughput.')
    if underperforming_inventory.exists():
        recommendations.append('Reprice or relist low-performing inventory to improve utilization and conversion.')
    if not recommendations:
        recommendations.append('Current metrics are stable; prioritize incremental conversion optimization and retention campaigns.')

    return Response({
        'window_days': 30,
        'kpis': {
            'bookings_created': booking_qs.count(),
            'bookings_completed': completed_qs.count(),
            'completion_rate_percent': round((completed_qs.count() / booking_qs.count()) * 100, 2) if booking_qs.exists() else 0,
            'gmv': float(gmv),
            'platform_commission': float(commission),
            'disputes': disputes,
            'average_trust_score': float(User.objects.aggregate(v=Avg('trust_score'))['v'] or 0),
        },
        'payment_kpis': {
            'successful_booking_payments': payment_success_count,
            'failed_booking_payments': payment_failed_count,
            'payment_success_rate_percent': round(
                (payment_success_count / (payment_success_count + payment_failed_count)) * 100,
                2,
            ) if (payment_success_count + payment_failed_count) else 0,
            'refunds_processed': refund_count,
        },
        'invoice_kpis': {
            'invoices_generated': invoice_generated_count,
            'pdf_generated': invoice_pdf_count,
            'delivery_coverage_percent': round(
                (invoice_pdf_count / invoice_generated_count) * 100,
                2,
            ) if invoice_generated_count else 0,
        },
        'sales_trend': sales_trend,
        'host_actions': host_actions[:20],
        'underperforming_inventory': [
            {
                'listing_id': listing.id,
                'title': listing.title,
                'host': listing.host.username,
                'daily_price': float(listing.daily_price),
                'rating': float(listing.rating),
            }
            for listing in underperforming_inventory
        ],
        'recommendations': recommendations,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def scm_dashboard(request):
    """ERP-SCM dashboard for procurement, supplier performance, and logistics signals."""
    end_date = _parse_date(request.query_params.get('end_date'), timezone.now())
    start_date = _parse_date(request.query_params.get('start_date'), end_date - timedelta(days=30))

    booking_window = Booking.objects.filter(created_at__gte=start_date, created_at__lte=end_date)
    completed_window = booking_window.filter(booking_status='completed')

    inventory_rows = Listing.objects.select_related('host', 'category').annotate(
        completed_window=Count(
            'bookings',
            filter=Q(bookings__created_at__gte=start_date, bookings__created_at__lte=end_date, bookings__booking_status='completed'),
        ),
        cancelled_window=Count(
            'bookings',
            filter=Q(bookings__created_at__gte=start_date, bookings__created_at__lte=end_date, bookings__booking_status='cancelled'),
        ),
        active_commitments=Count(
            'bookings',
            filter=Q(bookings__booking_status__in=['confirmed', 'in_use']),
        ),
        generated_gmv=Sum(
            'bookings__rental_amount',
            filter=Q(bookings__created_at__gte=start_date, bookings__created_at__lte=end_date, bookings__booking_status='completed'),
        ),
    )

    procurement_signals = []
    for listing in inventory_rows:
        demand_score = (listing.completed_window or 0) + (listing.active_commitments or 0)
        if demand_score >= 4:
            procurement_signals.append({
                'listing_id': listing.id,
                'title': listing.title,
                'category': listing.category.name if listing.category else 'Uncategorized',
                'host': listing.host.username,
                'signal': 'restock_priority',
                'reason': 'High demand observed in current window',
                'demand_score': demand_score,
                'window_gmv': float(listing.generated_gmv or 0),
            })
        elif listing.cancelled_window >= 2:
            procurement_signals.append({
                'listing_id': listing.id,
                'title': listing.title,
                'category': listing.category.name if listing.category else 'Uncategorized',
                'host': listing.host.username,
                'signal': 'supply_risk',
                'reason': 'Cancellation spikes suggest unstable supply quality/availability',
                'demand_score': demand_score,
                'window_gmv': float(listing.generated_gmv or 0),
            })

    supplier_rows = User.objects.filter(role__in=['host', 'both']).annotate(
        active_listings=Count('listings', filter=Q(listings__is_available=True), distinct=True),
        completed_bookings=Count(
            'host_bookings',
            filter=Q(host_bookings__created_at__gte=start_date, host_bookings__created_at__lte=end_date, host_bookings__booking_status='completed'),
            distinct=True,
        ),
        total_bookings=Count(
            'host_bookings',
            filter=Q(host_bookings__created_at__gte=start_date, host_bookings__created_at__lte=end_date),
            distinct=True,
        ),
        disputed=Count(
            'host_bookings',
            filter=Q(host_bookings__created_at__gte=start_date, host_bookings__created_at__lte=end_date, host_bookings__dispute_flag=True),
            distinct=True,
        ),
        gmv=Sum(
            'host_bookings__rental_amount',
            filter=Q(host_bookings__created_at__gte=start_date, host_bookings__created_at__lte=end_date, host_bookings__booking_status='completed'),
        ),
    )

    supplier_performance = []
    for host in supplier_rows:
        fill_rate = round((host.completed_bookings / host.total_bookings) * 100, 2) if host.total_bookings else 0
        supplier_performance.append({
            'host_id': host.id,
            'username': host.username,
            'active_listings': host.active_listings,
            'fill_rate_percent': fill_rate,
            'dispute_count': host.disputed,
            'gmv': float(host.gmv or 0),
            'risk_band': 'high' if host.disputed >= 2 or fill_rate < 50 else 'normal',
        })

    logistics_kpis = {
        'handover_completed': booking_window.filter(handover_at__isnull=False).count(),
        'returns_completed': booking_window.filter(return_at__isnull=False).count(),
        'handover_pending': booking_window.filter(booking_status='confirmed', handover_at__isnull=True).count(),
        'return_pending': booking_window.filter(booking_status='in_use', return_at__isnull=True).count(),
        'disputed_orders': booking_window.filter(dispute_flag=True).count(),
    }

    return Response({
        'range': {'start_date': start_date, 'end_date': end_date},
        'scm_summary': {
            'total_inventory_nodes': Listing.objects.count(),
            'available_inventory_nodes': Listing.objects.filter(is_available=True, verification_status='approved').count(),
            'window_completed_orders': completed_window.count(),
            'window_gmv': float(completed_window.aggregate(v=Sum('rental_amount'))['v'] or 0),
        },
        'procurement_signals': procurement_signals[:100],
        'supplier_performance': supplier_performance[:100],
        'logistics_kpis': logistics_kpis,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def revenue_report(request):
    """Backward-compatible compact revenue report endpoint."""
    end_date = _parse_date(request.query_params.get('end_date'), timezone.now())
    start_date = _parse_date(request.query_params.get('start_date'), end_date - timedelta(days=30))

    bookings = Booking.objects.filter(
        completed_at__gte=start_date,
        completed_at__lte=end_date,
        booking_status='completed',
    )

    total_commission = bookings.aggregate(v=Sum('platform_commission'))['v'] or Decimal('0')
    total_gmv = bookings.aggregate(v=Sum('rental_amount'))['v'] or Decimal('0')
    booking_count = bookings.count()

    return Response({
        'start_date': start_date,
        'end_date': end_date,
        'total_bookings': booking_count,
        'total_gmv': float(total_gmv),
        'total_commission': float(total_commission),
        'commission_rate': '18%',
        'average_booking_value': float(total_gmv / booking_count) if booking_count else 0,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def user_analytics(request):
    """Backward-compatible user analytics endpoint."""
    thirty_days_ago = timezone.now() - timedelta(days=30)
    new_users = User.objects.filter(created_at__gte=thirty_days_ago).count()
    user_by_role = User.objects.values('role').annotate(count=Count('id'))
    avg_trust_score = User.objects.aggregate(v=Avg('trust_score'))['v'] or 0
    active_users = User.objects.filter(
        Q(guest_bookings__created_at__gte=thirty_days_ago) |
        Q(host_bookings__created_at__gte=thirty_days_ago)
    ).distinct().count()

    return Response({
        'new_users_last_30_days': new_users,
        'user_by_role': list(user_by_role),
        'average_trust_score': float(avg_trust_score),
        'active_users': active_users,
    })
