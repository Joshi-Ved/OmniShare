from django.urls import path
from . import views

urlpatterns = [
    # Booking CRUD
    path('create/', views.BookingCreateView.as_view(), name='booking-create'),
    path('my-bookings/', views.MyBookingsView.as_view(), name='my-bookings'),
    path('<int:pk>/', views.BookingDetailView.as_view(), name='booking-detail'),
    
    # Booking State Transitions
    path('<int:booking_id>/confirm/', views.ConfirmBookingView.as_view(), name='booking-confirm'),
    path('handover/', views.HandoverView.as_view(), name='booking-handover'),
    path('return/', views.ReturnView.as_view(), name='booking-return'),
    path('<int:booking_id>/complete/', views.CompleteBookingView.as_view(), name='booking-complete'),
    
    # Disputes
    path('raise-dispute/', views.RaiseDisputeView.as_view(), name='raise-dispute'),
    path('resolve-dispute/', views.ResolveDisputeView.as_view(), name='resolve-dispute'),
    path('disputed/', views.DisputedBookingsView.as_view(), name='disputed-bookings'),
    path('admin/orders/', views.AdminBookingsView.as_view(), name='admin-bookings'),
    
    # Cancellation
    path('cancel/', views.CancelBookingView.as_view(), name='cancel-booking'),
    
    # Utilities
    path('blocked-dates/<int:listing_id>/', views.get_blocked_dates_view, name='blocked-dates'),
    path('calculate-price/', views.calculate_price_view, name='calculate-price'),
    
    # Admin Analytics
    path('statistics/', views.booking_statistics, name='booking-statistics'),
]
