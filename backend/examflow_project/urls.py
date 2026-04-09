"""
URL configuration for examflow_project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/', include('apps.users.urls')),

    # User management
    path('api/users/', include(('apps.users.urls_users', 'users'), namespace='users')),

    # Scanning — bundles & answer sheets
    path('api/bundles/', include(('apps.scanning.urls', 'scanning-bundles'), namespace='scanning-bundles')),
    path('api/answer-sheets/', include(('apps.scanning.urls_sheets', 'scanning-sheets'), namespace='scanning-sheets')),

    # Evaluation — marking schemes & evaluations
    path('api/marking-schemes/', include(('apps.evaluation.urls_schemes', 'eval-schemes'), namespace='eval-schemes')),
    path('api/evaluations/', include(('apps.evaluation.urls', 'evaluations'), namespace='evaluations')),

    # Amendments
    path('api/amendments/', include('apps.amendments.urls')),

    # Audit log
    path('api/audit-log/', include('apps.audit.urls')),

    # Reports
    path('api/reports/', include('apps.reports.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
