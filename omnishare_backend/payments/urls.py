from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views_enhanced import PaymentViewSet, InvoiceViewSet, WebhookViewSet

# Create router for ViewSets
router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'webhooks', WebhookViewSet, basename='webhook')

urlpatterns = [
    # ViewSet routes
    path('', include(router.urls)),
    
    # Legacy routes (if still using old view functions)
    path('create-order/<int:booking_id>/', views.create_order, name='create-order'),
    path('verify/', views.verify_payment, name='verify-payment'),
    path('transactions/', views.get_transaction_history, name='transaction-history'),
]
