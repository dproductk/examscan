from django.urls import path
from .views import (
    EvaluationCreateView,
    EvaluationDetailView,
    EvaluationAmendView,
    SaveEvaluationDraftView,
    MarkedPDFView,
    VerifyMarkedPDFView,
    PDFStatusView,
    BundleAssignmentCreateView,
    RequestComparisonView,
    ModerationStatusView,
    TeacherAssessmentBundlesView,
    TeacherModerationBundlesView,
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    # Critical Assessment
    VerifyHighScoreView,
    RequestCriticalComparisonView,
    CorrectCriticalMarksView,
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

    # Check background PDF generation status
    path('<int:pk>/pdf-status/', PDFStatusView.as_view(), name='pdf-status'),

    # Critical Assessment — moderator verifies high-score paper
    path('<int:sheet_id>/verify-high-score/', VerifyHighScoreView.as_view(), name='verify-high-score'),

    # Critical Assessment — assessor corrects failed paper
    path('<int:sheet_id>/correct-critical-marks/', CorrectCriticalMarksView.as_view(), name='correct-critical-marks'),
]

# Moderation URLs
moderation_urlpatterns = [
    path('moderation/<int:bundle_id>/request-comparison/', RequestComparisonView.as_view(), name='moderation-compare'),
    path('moderation/<int:bundle_id>/status/', ModerationStatusView.as_view(), name='moderation-status'),
    # Critical Assessment
    path('moderation/<int:bundle_id>/request-critical-comparison/', RequestCriticalComparisonView.as_view(), name='critical-comparison'),
]

# Teacher bundle URLs
teacher_urlpatterns = [
    path('teacher/bundles/assessment/', TeacherAssessmentBundlesView.as_view(), name='teacher-assessment-bundles'),
    path('teacher/bundles/moderation/', TeacherModerationBundlesView.as_view(), name='teacher-moderation-bundles'),
]

# Notification URLs
notification_urlpatterns = [
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-read'),
    path('notifications/read-all/', NotificationMarkAllReadView.as_view(), name='notification-read-all'),
]
