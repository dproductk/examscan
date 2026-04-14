from django.urls import path
from .views import ReportsSummaryView, ExcelExportView, StudentPDFExportView, AllPDFsExportView

urlpatterns = [
    path('', ReportsSummaryView.as_view(), name='reports-summary'),
    path('export/excel/', ExcelExportView.as_view(), name='reports-excel'),
    path('export/student-pdf/<str:roll_number>/', StudentPDFExportView.as_view(), name='reports-student-pdf'),
    path('export/all-pdfs/', AllPDFsExportView.as_view(), name='reports-all-pdfs'),
]
