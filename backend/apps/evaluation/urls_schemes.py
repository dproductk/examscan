from django.urls import path
from .views import MarkingSchemeListCreateView, MarkingSchemeDetailView

urlpatterns = [
    path('', MarkingSchemeListCreateView.as_view(), name='scheme-list-create'),
    path('<int:pk>/', MarkingSchemeDetailView.as_view(), name='scheme-detail'),
]
