from django.urls import path
from .views import AuditLogListView, AuditLogDetailView

urlpatterns = [
    path('', AuditLogListView.as_view(), name='audit-list'),
    path('<int:pk>/', AuditLogDetailView.as_view(), name='audit-detail'),
]
