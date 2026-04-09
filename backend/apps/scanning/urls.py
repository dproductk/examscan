from django.urls import path
from .views import (
    BundleCreateView, BundleListView, BundleDetailView, BundleSubmitView,
    SubjectListCreateView, BundleAssignView,
)

urlpatterns = [
    path('', BundleCreateView.as_view(), name='bundle-create'),
    path('list/', BundleListView.as_view(), name='bundle-list'),
    path('<int:pk>/', BundleDetailView.as_view(), name='bundle-detail'),
    path('<int:pk>/submit/', BundleSubmitView.as_view(), name='bundle-submit'),
    path('<int:pk>/assign/', BundleAssignView.as_view(), name='bundle-assign'),
    path('subjects/', SubjectListCreateView.as_view(), name='subject-list-create'),
]
