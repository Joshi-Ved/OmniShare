from rest_framework import serializers


class LeadCaptureSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    phone = serializers.RegexField(
        regex=r'^\+?[0-9\-\s]{7,20}$',
        required=False,
        allow_blank=True,
        error_messages={'invalid': 'Phone number contains invalid characters.'},
    )
    source = serializers.CharField(max_length=50, required=False, default='landing_page')
    interested_in = serializers.ChoiceField(
        choices=['host', 'guest', 'both'],
        required=False,
        default='guest',
    )
    message = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    encrypted_message = serializers.CharField(max_length=8000, required=False, allow_blank=True)
    encryption_iv = serializers.CharField(max_length=200, required=False, allow_blank=True)
    encryption_salt = serializers.CharField(max_length=200, required=False, allow_blank=True)
    e2e_enabled = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        e2e_enabled = attrs.get('e2e_enabled', False)
        encrypted_message = attrs.get('encrypted_message', '')
        encryption_iv = attrs.get('encryption_iv', '')
        encryption_salt = attrs.get('encryption_salt', '')

        if e2e_enabled:
            if not encrypted_message or not encryption_iv or not encryption_salt:
                raise serializers.ValidationError(
                    'Encrypted payload, IV, and salt are required when e2e_enabled is true.'
                )
            attrs['message'] = ''

        return attrs
