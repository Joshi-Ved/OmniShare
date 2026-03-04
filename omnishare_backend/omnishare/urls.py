"""
URL configuration for omnishare project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


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

urlpatterns = [
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
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
