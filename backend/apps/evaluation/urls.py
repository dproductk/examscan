from django.urls import path
from .views import EvaluationCreateView, EvaluationDetailView, EvaluationAmendView

urlpatterns = [
    path('', EvaluationCreateView.as_view(), name='evaluation-create'),
    path('<int:answer_sheet_id>/', EvaluationDetailView.as_view(), name='evaluation-detail'),
    path('<int:pk>/amend-marks/', EvaluationAmendView.as_view(), name='evaluation-amend'),
]
