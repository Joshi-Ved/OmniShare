from django.urls import path
from . import views

urlpatterns = [
    path('leads/capture/', views.capture_lead, name='capture-lead'),
    path('referral-code/', views.get_referral_code, name='get-referral-code'),
    path('referral-stats/', views.get_referral_stats, name='referral-stats'),
]
