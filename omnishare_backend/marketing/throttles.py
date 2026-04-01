from rest_framework.throttling import ScopedRateThrottle


class LeadCaptureThrottle(ScopedRateThrottle):
    scope = 'lead_capture'
