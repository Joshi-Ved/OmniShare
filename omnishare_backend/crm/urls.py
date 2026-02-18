from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard_analytics, name='dashboard-analytics'),
    path('revenue-report/', views.revenue_report, name='revenue-report'),
    path('user-analytics/', views.user_analytics, name='user-analytics'),
]
