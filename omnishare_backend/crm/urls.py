from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard_analytics, name='dashboard-analytics'),
    path('revenue-report/', views.revenue_report, name='revenue-report'),
    path('user-analytics/', views.user_analytics, name='user-analytics'),
    path('customers/', views.customer_management, name='customer-management'),
    path('customers/<int:user_id>/', views.customer_detail, name='customer-detail'),
    path('sales-report/', views.sales_report, name='sales-report'),
    path('inventory-linkage/', views.inventory_linkage_report, name='inventory-linkage-report'),
    path('scm-dashboard/', views.scm_dashboard, name='scm-dashboard'),
    path('decision-support/', views.decision_support_dashboard, name='decision-support-dashboard'),
]
