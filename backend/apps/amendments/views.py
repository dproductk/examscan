import os
from django.conf import settings
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsScanningStaff, IsExamDept
from apps.scanning.models import AnswerSheet
from utils.audit_helper import log_action
from utils.pdf_compiler import compile_images_to_pdf
from .models import AmendmentRequest
from .serializers import AmendmentRequestSerializer


class AmendmentCreateView(APIView):
    """POST /api/amendments/ — Exam dept creates an amendment request."""
    permission_classes = [IsExamDept]

    def post(self, request):
        serializer = AmendmentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(requested_by=request.user)

        log_action(
            request, 'AMENDMENT_REQUEST', 'AmendmentRequest', instance.pk,
            new_value=AmendmentRequestSerializer(instance).data,
            notes=f'Amendment requested: {instance.reason}.'
        )

        return Response(
            AmendmentRequestSerializer(instance).data,
            status=status.HTTP_201_CREATED
        )


class AmendmentListView(generics.ListAPIView):
    """GET /api/amendments/ — Exam dept lists all amendment requests."""
    queryset = AmendmentRequest.objects.select_related(
        'answer_sheet', 'requested_by', 'assigned_scanner', 'resolved_by'
    ).all()
    serializer_class = AmendmentRequestSerializer
    permission_classes = [IsExamDept]


class AmendmentResolveView(APIView):
    """PATCH /api/amendments/{id}/resolve/ — Exam dept marks amendment as resolved/rejected."""
    permission_classes = [IsExamDept]

    def patch(self, request, pk):
        try:
            amendment = AmendmentRequest.objects.get(pk=pk)
        except AmendmentRequest.DoesNotExist:
            return Response({'error': 'Amendment not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status not in ('resolved', 'rejected'):
            return Response(
                {'error': 'Status must be "resolved" or "rejected".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = amendment.status
        amendment.status = new_status
        amendment.resolved_at = timezone.now()
        amendment.resolved_by = request.user
        amendment.save()

        log_action(
            request, 'AMENDMENT_COMPLETE', 'AmendmentRequest', amendment.pk,
            old_value={'status': old_status},
            new_value={'status': new_status},
            notes=f'Amendment {new_status}.'
        )

        return Response(AmendmentRequestSerializer(amendment).data, status=status.HTTP_200_OK)


class AmendmentRescanView(APIView):
    """
    POST /api/amendments/{id}/rescan/ — Scanning staff uploads a new PDF
    for an amendment request.
    """
    permission_classes = [IsScanningStaff]
    parser_classes = [MultiPartParser]

    def post(self, request, pk):
        try:
            amendment = AmendmentRequest.objects.select_related('answer_sheet').get(pk=pk)
        except AmendmentRequest.DoesNotExist:
            return Response({'error': 'Amendment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if amendment.status not in ('open', 'in_progress'):
            return Response(
                {'error': 'Amendment is already resolved or rejected.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        pdf_file = request.FILES.get('pdf_file')
        if not pdf_file:
            return Response({'error': 'pdf_file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        sheet = amendment.answer_sheet
        old_version = sheet.pdf_version
        sheet.pdf_version += 1
        sheet.pdf_file = pdf_file
        sheet.status = 'pending'  # reset back to pending for re-evaluation
        sheet.save()

        amendment.status = 'resolved'
        amendment.resolved_at = timezone.now()
        amendment.resolved_by = request.user
        amendment.new_pdf_version = sheet.pdf_version
        amendment.save()

        log_action(
            request, 'AMENDMENT_COMPLETE', 'AmendmentRequest', amendment.pk,
            old_value={'pdf_version': old_version},
            new_value={'pdf_version': sheet.pdf_version},
            notes=f'Rescan completed. New PDF version: {sheet.pdf_version}.'
        )

        return Response(AmendmentRequestSerializer(amendment).data, status=status.HTTP_200_OK)
