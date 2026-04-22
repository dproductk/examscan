from django.urls import path
from .views import (
    AnswerSheetImageUploadView, AnswerSheetImageDeleteView, AnswerSheetFinalizeView,
    AnswerSheetListView, AnswerSheetAssignView, AnswerSheetBulkAssignView,
    AnswerSheetFlagView, AnswerSheetPDFView,
    AnswerSheetThumbnailView, AnswerSheetReplaceImageView,
    IPWebcamProxyView,
)

urlpatterns = [
    path('', AnswerSheetListView.as_view(), name='sheet-list'),
    path('upload-image/', AnswerSheetImageUploadView.as_view(), name='sheet-upload-image'),
    path('upload-image/<int:pk>/', AnswerSheetImageDeleteView.as_view(), name='sheet-delete-image'),
    path('finalize/', AnswerSheetFinalizeView.as_view(), name='sheet-finalize'),
    path('<int:pk>/assign/', AnswerSheetAssignView.as_view(), name='sheet-assign'),
    path('bulk-assign/', AnswerSheetBulkAssignView.as_view(), name='sheet-bulk-assign'),
    path('<int:pk>/flag/', AnswerSheetFlagView.as_view(), name='sheet-flag'),
    path('<int:pk>/pdf/', AnswerSheetPDFView.as_view(), name='sheet-pdf'),
    path('<int:pk>/thumbnail/', AnswerSheetThumbnailView.as_view(), name='sheet-thumbnail'),
    path('<int:pk>/replace-image/', AnswerSheetReplaceImageView.as_view(), name='sheet-replace-image'),
    path('ip-webcam-proxy/', IPWebcamProxyView.as_view(), name='ip-webcam-proxy'),
]
