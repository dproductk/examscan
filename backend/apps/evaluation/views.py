import hashlib
import os

from django.conf import settings
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsTeacher, IsExamDept
from apps.scanning.models import MarkingScheme, AnswerSheet, Subject
from apps.scanning.serializers import MarkingSchemeSerializer
from apps.audit.models import AuditLog
from utils.audit_helper import log_action
from .models import EvaluationResult
from .serializers import EvaluationResultSerializer
from .pdf_annotator import annotate_pdf


class IsTeacherOrExamDept(IsAuthenticated):
    """Allow access to users with 'teacher' or 'exam_dept' role."""
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.role in ('teacher', 'exam_dept')



# ─────────────────────────────────────────────────────────
# Marking Scheme Views
# ─────────────────────────────────────────────────────────

class MarkingSchemeListCreateView(generics.ListCreateAPIView):
    """GET / POST marking schemes."""
    queryset = MarkingScheme.objects.select_related('subject').all()
    serializer_class = MarkingSchemeSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsExamDept()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        subject_code = self.request.query_params.get('subject_code')
        if subject_code:
            qs = qs.filter(subject__subject_code=subject_code)
        return qs

    def create(self, request, *args, **kwargs):
        subject_code = request.data.get('subject_code')
        subject_name = request.data.get('subject_name')
        department = request.data.get('department', '')
        semester = request.data.get('semester')
        sections = request.data.get('sections')

        if not subject_code or not subject_name or not sections:
            return Response(
                {'error': 'subject_code, subject_name and sections are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        subject, created = Subject.objects.get_or_create(
            subject_code=subject_code,
            defaults={
                'subject_name': subject_name,
                'department': department,
                'semester': int(semester) if semester else 1
            }
        )

        if not created and MarkingScheme.objects.filter(subject=subject).exists():
           return Response(
               {'error': f'A marking scheme already exists for subject {subject_code}.'},
               status=status.HTTP_400_BAD_REQUEST
           )

        scheme_data = {
            'subject': subject.id,
            'sections': sections
        }

        serializer = self.get_serializer(data=scheme_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(
            self.request, 'SCAN', 'MarkingScheme', instance.pk,
            new_value=MarkingSchemeSerializer(instance).data,
            notes=f'Marking scheme created for {instance.subject.subject_code}.'
        )


class MarkingSchemeDetailView(generics.RetrieveUpdateAPIView):
    """GET / PUT marking scheme by ID."""
    queryset = MarkingScheme.objects.select_related('subject').all()
    serializer_class = MarkingSchemeSerializer

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsExamDept()]
        return [IsAuthenticated()]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        subject_name = request.data.get('subject_name')
        subject_code = request.data.get('subject_code')
        department = request.data.get('department')
        semester = request.data.get('semester')
        sections = request.data.get('sections')

        subject = instance.subject
        subject_updated = False
        if subject_name and subject.subject_name != subject_name:
            subject.subject_name = subject_name
            subject_updated = True
        if subject_code and subject.subject_code != subject_code:
            if Subject.objects.exclude(id=subject.id).filter(subject_code=subject_code).exists():
                 return Response({'error': 'subject_code already in use.'}, status=400)
            subject.subject_code = subject_code
            subject_updated = True
        if department is not None and subject.department != department:
            subject.department = department
            subject_updated = True
        if semester is not None:
            try:
                sem = int(semester)
                if subject.semester != sem:
                    subject.semester = sem
                    subject_updated = True
            except ValueError:
                pass

        if subject_updated:
            subject.save()

        scheme_data = {'subject': subject.id}
        if sections is not None:
             scheme_data['sections'] = sections

        serializer = self.get_serializer(instance, data=scheme_data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    def perform_update(self, serializer):
        old_data = MarkingSchemeSerializer(self.get_object()).data
        instance = serializer.save()
        log_action(
            self.request, 'EDIT_MARKS', 'MarkingScheme', instance.pk,
            old_value=old_data,
            new_value=MarkingSchemeSerializer(instance).data,
            notes=f'Marking scheme updated for {instance.subject.subject_code}.'
        )


# ─────────────────────────────────────────────────────────
# Evaluation Views
# ─────────────────────────────────────────────────────────

class EvaluationCreateView(APIView):
    """
    POST /api/evaluations/
    Teacher submits grading for an answer sheet.

    Accepts mark_positions list alongside section_results.
    After saving marks, generates an annotated PDF (_v2_marked.pdf) with
    red badges baked in using ReportLab + pypdf. PDF failure is non-fatal.
    """
    permission_classes = [IsTeacher]

    def post(self, request):
        serializer = EvaluationResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answer_sheet_id = request.data.get('answer_sheet')
        mark_positions = request.data.get('mark_positions', [])

        try:
            sheet = AnswerSheet.objects.get(pk=answer_sheet_id, assigned_teacher=request.user)
        except AnswerSheet.DoesNotExist:
            return Response(
                {'error': 'Answer sheet not found or not assigned to you.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # ── Upsert evaluation ────────────────────────────────────────────────
        if hasattr(sheet, 'evaluation'):
            existing = sheet.evaluation
            old_data = EvaluationResultSerializer(existing).data

            # Update existing
            for field, value in serializer.validated_data.items():
                setattr(existing, field, value)
            existing.mark_positions = mark_positions
            existing.total_marks = getattr(serializer, '_computed_total', existing.total_marks)
            existing.save()
            existing.refresh_from_db()

            instance = existing
            is_new = False
        else:
            instance = serializer.save(
                teacher=request.user,
                pdf_version_at_grading=sheet.pdf_version,
                mark_positions=mark_positions,
            )
            is_new = True

        # ── Generate annotated PDF ───────────────────────────────────────────
        pdf_hash = None
        marked_pdf_rel = None

        if mark_positions:
            try:
                original_pdf_path = sheet.pdf_file.path
                output_pdf_path = os.path.join(
                    settings.MEDIA_ROOT,
                    'answer_sheets',
                    str(sheet.bundle_id),
                    f'{sheet.token}_v2_marked.pdf',
                )
                pdf_hash = annotate_pdf(
                    original_pdf_path=original_pdf_path,
                    mark_positions=mark_positions,
                    output_pdf_path=output_pdf_path,
                )
                marked_pdf_rel = os.path.relpath(output_pdf_path, settings.MEDIA_ROOT)
                instance.marked_pdf_path = marked_pdf_rel
                instance.save(update_fields=['marked_pdf_path'])
            except Exception as exc:
                # Non-fatal — marks saved, PDF will be absent
                print(f'[ExamFlow] PDF annotation failed for sheet {sheet.id}: {exc}')

        # ── Update sheet status ──────────────────────────────────────────────
        sheet.status = 'completed'
        sheet.save(update_fields=['status'])

        # ── AuditLog ─────────────────────────────────────────────────────────
        action_type = 'GRADE' if is_new else 'EDIT_MARKS'
        log_action(
            request, action_type, 'EvaluationResult', instance.pk,
            old_value=None if is_new else EvaluationResultSerializer(instance).data,
            new_value={
                'total_marks': instance.total_marks,
                'marked_pdf_path': marked_pdf_rel,
                'pdf_sha256': pdf_hash,
                'badge_count': len(mark_positions),
            },
            notes=f'Evaluated by {request.user.full_name}. Total: {instance.total_marks}.',
        )

        return Response(
            EvaluationResultSerializer(instance).data,
            status=status.HTTP_201_CREATED if is_new else status.HTTP_200_OK,
        )


class EvaluationDetailView(APIView):
    """
    GET /api/evaluations/{answer_sheet_id}/
    Retrieve evaluation result for an answer sheet.
    """

    def get_permissions(self):
        return [IsTeacherOrExamDept()]

    def get(self, request, answer_sheet_id):
        try:
            result = EvaluationResult.objects.select_related(
                'teacher', 'answer_sheet'
            ).get(answer_sheet_id=answer_sheet_id)
        except EvaluationResult.DoesNotExist:
            return Response(
                {'error': 'Evaluation result not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if request.user.role == 'teacher' and result.teacher != request.user:
            return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        return Response(EvaluationResultSerializer(result).data)


class EvaluationAmendView(APIView):
    """
    PATCH /api/evaluations/{pk}/amend-marks/
    Exam Dept corrects marks post-submission.
    """
    permission_classes = [IsExamDept]

    def patch(self, request, pk):
        try:
            result = EvaluationResult.objects.select_related(
                'teacher', 'answer_sheet'
            ).get(pk=pk)
        except EvaluationResult.DoesNotExist:
            return Response(
                {'error': 'Evaluation result not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        new_section_results = request.data.get('section_results')
        if not new_section_results:
            return Response(
                {'error': 'section_results is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = EvaluationResultSerializer(
            result, data={'section_results': new_section_results,
                          'answer_sheet': result.answer_sheet_id,
                          'pdf_version_at_grading': result.pdf_version_at_grading},
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        old_data = {
            'section_results': result.section_results,
            'total_marks': result.total_marks,
        }

        result.section_results = serializer.validated_data['section_results']
        result.total_marks = getattr(serializer, '_computed_total', result.total_marks)
        result.was_amended = True
        result.amended_at = timezone.now()
        result.save()

        log_action(
            request, 'AMEND_MARKS', 'EvaluationResult', result.pk,
            old_value=old_data,
            new_value={'section_results': result.section_results, 'total_marks': result.total_marks},
            notes=f'Marks amended by Exam Dept. New total: {result.total_marks}.'
        )

        return Response(EvaluationResultSerializer(result).data, status=status.HTTP_200_OK)


class SaveEvaluationDraftView(APIView):
    """
    PATCH /api/evaluations/draft/
    Teacher only. Upserts marks + badge positions without generating the PDF
    and without changing sheet status to 'completed'.
    Called automatically every 30 s by EvaluationScreen.
    """
    permission_classes = [IsTeacher]

    def patch(self, request):
        answer_sheet_id = request.data.get('answer_sheet')
        section_results = request.data.get('section_results', [])
        mark_positions  = request.data.get('mark_positions', [])

        try:
            sheet = AnswerSheet.objects.get(
                pk=answer_sheet_id,
                assigned_teacher=request.user,
            )
        except AnswerSheet.DoesNotExist:
            return Response({'error': 'Answer sheet not found.'}, status=404)

        if sheet.status == 'completed':
            return Response({'error': 'Sheet already submitted.'}, status=400)

        # Compute total (best-effort, no validation errors raised)
        total = 0
        for q in (section_results or []):
            for sq in q.get('sub_questions', []):
                for p in sq.get('parts', []):
                    v = p.get('marks_obtained')
                    if isinstance(v, (int, float)) and v >= 0:
                        total += v

        result, created = EvaluationResult.objects.update_or_create(
            answer_sheet=sheet,
            defaults={
                'teacher': request.user,
                'section_results': section_results,
                'mark_positions': mark_positions,
                'total_marks': total,
                'pdf_version_at_grading': sheet.pdf_version,
            }
        )

        if sheet.status == 'assigned':
            sheet.status = 'under_evaluation'
            sheet.save(update_fields=['status'])

        return Response({'status': 'draft_saved', 'total_marks': total}, status=200)


class MarkedPDFView(APIView):
    """
    GET /api/evaluations/{pk}/marked-pdf/
    Streams the annotated (v2) PDF.
    Teachers can only access their own. Exam dept can access any.
    """
    def get_permissions(self):
        return [IsTeacherOrExamDept()]

    def get(self, request, pk):
        try:
            result = EvaluationResult.objects.select_related('answer_sheet').get(pk=pk)
        except EvaluationResult.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        if request.user.role == 'teacher' and result.teacher != request.user:
            return Response({'error': 'Forbidden.'}, status=403)

        if not result.marked_pdf_path:
            return Response({'error': 'Marked PDF not yet generated.'}, status=404)

        full_path = os.path.join(settings.MEDIA_ROOT, result.marked_pdf_path)
        if not os.path.exists(full_path):
            return Response({'error': 'Marked PDF file not found on disk.'}, status=404)

        response = FileResponse(open(full_path, 'rb'), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="marked_{pk}.pdf"'
        return response


class VerifyMarkedPDFView(APIView):
    """
    GET /api/evaluations/{pk}/verify-pdf/
    Exam dept only. Recomputes SHA-256 of the stored marked PDF and compares
    it against the hash logged in AuditLog at submission time.
    """
    permission_classes = [IsExamDept]

    def get(self, request, pk):
        try:
            result = EvaluationResult.objects.get(pk=pk)
        except EvaluationResult.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        if not result.marked_pdf_path:
            return Response({'error': 'No marked PDF for this evaluation.'}, status=404)

        full_path = os.path.join(settings.MEDIA_ROOT, result.marked_pdf_path)
        if not os.path.exists(full_path):
            return Response({'error': 'Marked PDF missing from disk.'}, status=404)

        with open(full_path, 'rb') as f:
            computed_hash = hashlib.sha256(f.read()).hexdigest()

        # Retrieve stored hash from most recent GRADE AuditLog entry
        log_entry = AuditLog.objects.filter(
            action_type='GRADE',
            target_model='EvaluationResult',
            target_id=str(pk),
        ).order_by('-performed_at').first()

        stored_hash = None
        if log_entry and log_entry.new_value:
            stored_hash = log_entry.new_value.get('pdf_sha256')

        return Response({
            'verified': stored_hash is not None,
            'stored_hash': stored_hash,
            'computed_hash': computed_hash,
            'match': stored_hash == computed_hash,
        })
