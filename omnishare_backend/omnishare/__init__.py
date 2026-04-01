"""OmniShare package initialization."""

from .compat import patch_django_template_context_copy

patch_django_template_context_copy()
