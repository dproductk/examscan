from django.urls import path
from .views import (
    BundleCreateView, BundleListView, BundleDetailView, BundleSubmitView,
    SubjectListCreateView, BundleAssignView,
    GenerateStudentTokensView, ListStudentTokensView, TokenFileUploadView,
    BundleQualityCheckView,
)

urlpatterns = [
    path('', BundleCreateView.as_view(), name='bundle-create'),
    path('list/', BundleListView.as_view(), name='bundle-list'),
    path('<int:pk>/', BundleDetailView.as_view(), name='bundle-detail'),
    path('<int:pk>/submit/', BundleSubmitView.as_view(), name='bundle-submit'),
    path('<int:pk>/assign/', BundleAssignView.as_view(), name='bundle-assign'),
    path('subjects/', SubjectListCreateView.as_view(), name='subject-list-create'),

    # Token management (Exam Dept only)
    path('tokens/generate/', GenerateStudentTokensView.as_view(), name='generate-tokens'),
    path('tokens/upload/', TokenFileUploadView.as_view(), name='upload-tokens'),
    path('tokens/', ListStudentTokensView.as_view(), name='list-tokens'),

    # Quality check (Scanning Staff)
    path('<int:bundle_id>/quality-check/', BundleQualityCheckView.as_view(), name='bundle-quality-check'),
]
