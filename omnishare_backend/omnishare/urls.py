"""
URL configuration for omnishare project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.shortcuts import redirect


def api_root(_request):
    return JsonResponse({
        'name': 'OmniShare API',
        'status': 'ok',
        'endpoints': {
            'users': '/api/users/',
            'listings': '/api/listings/',
            'bookings': '/api/bookings/',
            'payments': '/api/payments/',
            'crm': '/api/crm/',
            'marketing': '/api/marketing/',
        }
    })


def root_redirect(_request):
    return redirect('/admin/')


def admin_erp_redirect(_request):
    return redirect('/admin/#omni-kpis')


def healthcheck(_request):
    return JsonResponse({'status': 'ok'})

from crm import views as crm_views

urlpatterns = [
    path('', root_redirect),
    path('healthz/', healthcheck, name='healthcheck'),
    path('admin/erp/', admin_erp_redirect, name='admin-erp'),
    path('admin/crm-dashboard/', crm_views.admin_crm_dashboard, name='admin_crm_dashboard'),
    path('admin/scm-dashboard/', crm_views.admin_scm_dashboard, name='admin_scm_dashboard'),
    path('admin/customers-gui/', crm_views.admin_customers_gui, name='admin_customers_gui'),
    path('admin/sales-gui/', crm_views.admin_sales_gui, name='admin_sales_gui'),
    path('admin/decision-gui/', crm_views.admin_decision_gui, name='admin_decision_gui'),
    path('admin/moderation-gui/', crm_views.admin_moderation_gui, name='admin_moderation_gui'),
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api-root'),
    path('api/users/', include('users.urls')),
    path('api/listings/', include('listings.urls')),
    path('api/bookings/', include('bookings.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/crm/', include('crm.urls')),
    path('api/marketing/', include('marketing.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
