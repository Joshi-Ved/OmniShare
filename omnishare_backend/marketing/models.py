from django.db import models


class Lead(models.Model):
    """Marketing leads from landing page"""
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=15, blank=True)
    source = models.CharField(max_length=50, default='landing_page')
    interested_in = models.CharField(
        max_length=20,
        choices=[('host', 'Hosting'), ('guest', 'Renting'), ('both', 'Both')],
        default='guest'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.email} - {self.source}"


class ReferralCode(models.Model):
    """Referral system for user acquisition"""
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='referral_code')
    code = models.CharField(max_length=20, unique=True)
    uses = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.code}"


class Referral(models.Model):
    """Track referral usage"""
    referrer = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='referrals_made')
    referred = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='referred_by_user')
    code_used = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.referrer.username} referred {self.referred.username}"
