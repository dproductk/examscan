from django.urls import path
from .views import (
    AmendmentCreateView, AmendmentListView,
    AmendmentResolveView, AmendmentRescanView,
)

urlpatterns = [
    path('', AmendmentCreateView.as_view(), name='amendment-create'),
    path('list/', AmendmentListView.as_view(), name='amendment-list'),
    path('<int:pk>/resolve/', AmendmentResolveView.as_view(), name='amendment-resolve'),
    path('<int:pk>/rescan/', AmendmentRescanView.as_view(), name='amendment-rescan'),
]
