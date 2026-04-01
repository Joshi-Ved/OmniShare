"""Runtime compatibility patches for the OmniShare backend."""

from __future__ import annotations

import sys


def patch_django_template_context_copy() -> None:
    """
    Fix Django 4.2 template Context copy behavior on Python 3.14.

    Django admin add/change views internally copy template context. On Python
    3.14 with Django 4.2.x this can raise:
    AttributeError: 'super' object has no attribute 'dicts'
    """

    # Only apply where the incompatibility is known to occur.
    if sys.version_info < (3, 14):
        return

    try:
        from django.template.context import BaseContext
    except Exception:
        return

    if getattr(BaseContext, "_omnishare_copy_patch", False):
        return

    def _patched_copy(self):
        duplicate = self.__class__.__new__(self.__class__)
        duplicate.__dict__ = self.__dict__.copy()
        duplicate.dicts = self.dicts[:]
        return duplicate

    BaseContext.__copy__ = _patched_copy
    BaseContext._omnishare_copy_patch = True
