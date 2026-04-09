from django.urls import path
from .views import ReportsSummaryView, ExcelExportView, PDFExportView

urlpatterns = [
    path('', ReportsSummaryView.as_view(), name='reports-summary'),
    path('export/excel/', ExcelExportView.as_view(), name='reports-excel'),
    path('export/pdf/', PDFExportView.as_view(), name='reports-pdf'),
]
