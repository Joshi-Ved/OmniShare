from django.urls import path
from . import views

urlpatterns = [
    # Categories
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    
    # Listings - Public
    path('', views.ListingListView.as_view(), name='listing-list'),
    path('<int:pk>/', views.ListingDetailView.as_view(), name='listing-detail'),
    path('promoted/', views.PromotedListingsView.as_view(), name='promoted-listings'),
    
    # Listings - Host Management
    path('create/', views.ListingCreateView.as_view(), name='listing-create'),
    path('<int:pk>/update/', views.ListingUpdateView.as_view(), name='listing-update'),
    path('<int:pk>/delete/', views.ListingDeleteView.as_view(), name='listing-delete'),
    path('my-listings/', views.MyListingsView.as_view(), name='my-listings'),
    
    # Images
    path('<int:listing_id>/images/', views.ListingImageUploadView.as_view(), name='listing-image-upload'),
    
    # Admin - Verification
    path('pending/', views.PendingListingsView.as_view(), name='pending-listings'),
    path('verify/', views.VerifyListingView.as_view(), name='verify-listing'),
    path('<int:listing_id>/promote/', views.promote_listing, name='promote-listing'),
    
    # Reviews
    path('reviews/create/', views.ReviewCreateView.as_view(), name='review-create'),
    path('<int:listing_id>/reviews/', views.ReviewListView.as_view(), name='review-list'),
]
