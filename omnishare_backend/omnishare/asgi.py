"""
ASGI config for omnishare project.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'omnishare.settings')

application = get_asgi_application()
