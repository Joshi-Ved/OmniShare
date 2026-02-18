from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    # Authentication
    path('register/', views.UserRegistrationView.as_view(), name='user-register'),
    path('login/', TokenObtainPairView.as_view(), name='token-obtain'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # Profile
    path('profile/', views.UserProfileView.as_view(), name='user-profile'),
    
    # KYC
    path('kyc/submit/', views.KYCSubmissionView.as_view(), name='kyc-submit'),
    path('kyc/verify/', views.KYCVerificationView.as_view(), name='kyc-verify'),
    path('kyc/pending/', views.PendingKYCListView.as_view(), name='kyc-pending'),
    
    # Trust Score
    path('trust-score/', views.TrustScoreView.as_view(), name='trust-score'),
    path('trust-score/<int:user_id>/', views.TrustScoreView.as_view(), name='trust-score-detail'),
    path('trust-scores/update-all/', views.force_update_trust_scores, name='update-trust-scores'),
    
    # Gold Hosts
    path('gold-hosts/', views.GoldHostListView.as_view(), name='gold-hosts'),
]
