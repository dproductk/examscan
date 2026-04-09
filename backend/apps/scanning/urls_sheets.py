from django.urls import path
from .views import (
    AnswerSheetImageUploadView, AnswerSheetImageDeleteView, AnswerSheetFinalizeView,
    AnswerSheetListView, AnswerSheetAssignView, AnswerSheetBulkAssignView,
    AnswerSheetFlagView, AnswerSheetPDFView,
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
]
