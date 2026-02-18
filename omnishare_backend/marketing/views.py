from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Lead, ReferralCode, Referral


@api_view(['POST'])
@permission_classes([AllowAny])
def capture_lead(request):
    """Capture lead from landing page"""
    email = request.data.get('email')
    name = request.data.get('name', '')
    phone = request.data.get('phone', '')
    source = request.data.get('source', 'landing_page')
    interested_in = request.data.get('interested_in', 'guest')
    
    if not email:
        return Response({
            'error': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    lead, created = Lead.objects.get_or_create(
        email=email,
        defaults={
            'name': name,
            'phone': phone,
            'source': source,
            'interested_in': interested_in
        }
    )
    
    if created:
        return Response({
            'message': 'Thank you for your interest! We will contact you soon.'
        }, status=status.HTTP_201_CREATED)
    else:
        return Response({
            'message': 'You are already registered. We will contact you soon.'
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_referral_code(request):
    """Get or create referral code for user"""
    import random
    import string
    
    user = request.user
    
    referral_code, created = ReferralCode.objects.get_or_create(
        user=user,
        defaults={
            'code': ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        }
    )
    
    return Response({
        'code': referral_code.code,
        'uses': referral_code.uses,
        'referral_link': f'https://omnishare.com/signup?ref={referral_code.code}'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_referral_stats(request):
    """Get user's referral statistics"""
    user = request.user
    
    total_referrals = Referral.objects.filter(referrer=user).count()
    
    return Response({
        'total_referrals': total_referrals
    })
