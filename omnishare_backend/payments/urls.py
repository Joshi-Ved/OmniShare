from django.urls import path
from . import views

urlpatterns = [
    path('create-order/<int:booking_id>/', views.create_order, name='create-order'),
    path('verify/', views.verify_payment, name='verify-payment'),
    path('transactions/', views.get_transaction_history, name='transaction-history'),
]
