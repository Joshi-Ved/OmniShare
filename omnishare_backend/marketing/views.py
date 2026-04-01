from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.decorators import throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Lead, ReferralCode, Referral
from .serializers import LeadCaptureSerializer
from .throttles import LeadCaptureThrottle


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LeadCaptureThrottle])
def capture_lead(request):
    """Capture lead from landing page"""
    serializer = LeadCaptureSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    payload = serializer.validated_data
    email = payload['email']
    
    lead, created = Lead.objects.get_or_create(
        email=email,
        defaults={
            'name': payload.get('name', ''),
            'phone': payload.get('phone', ''),
            'source': payload.get('source', 'landing_page'),
            'interested_in': payload.get('interested_in', 'guest'),
            'message': payload.get('message', ''),
            'encrypted_message': payload.get('encrypted_message', ''),
            'encryption_iv': payload.get('encryption_iv', ''),
            'encryption_salt': payload.get('encryption_salt', ''),
            'e2e_enabled': payload.get('e2e_enabled', False),
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
