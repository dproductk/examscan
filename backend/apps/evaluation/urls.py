from django.urls import path
from .views import (
    EvaluationCreateView,
    EvaluationDetailView,
    EvaluationAmendView,
    SaveEvaluationDraftView,
    MarkedPDFView,
    VerifyMarkedPDFView,
)

urlpatterns = [
    # Submit / update evaluation (with mark positions + PDF generation)
    path('', EvaluationCreateView.as_view(), name='evaluation-create'),

    # Auto-save draft — no PDF generation, no status change
    path('draft/', SaveEvaluationDraftView.as_view(), name='evaluation-draft'),

    # Retrieve evaluation by answer sheet ID
    path('<int:answer_sheet_id>/', EvaluationDetailView.as_view(), name='evaluation-detail'),

    # Amend marks (exam dept only)
    path('<int:pk>/amend-marks/', EvaluationAmendView.as_view(), name='evaluation-amend'),

    # Stream the annotated PDF (_v2_marked.pdf)
    path('<int:pk>/marked-pdf/', MarkedPDFView.as_view(), name='marked-pdf'),

    # Tamper-detection: compare SHA-256 (exam dept only)
    path('<int:pk>/verify-pdf/', VerifyMarkedPDFView.as_view(), name='verify-pdf'),
]
