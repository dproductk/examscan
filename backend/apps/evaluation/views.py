from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from apps.users.permissions import IsTeacher, IsExamDept
from apps.scanning.models import MarkingScheme, AnswerSheet, Subject
from apps.scanning.serializers import MarkingSchemeSerializer
from utils.audit_helper import log_action
from .models import EvaluationResult
from .serializers import EvaluationResultSerializer


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

        # Update subject if provided
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
    """
    permission_classes = [IsTeacher]

    def post(self, request):
        serializer = EvaluationResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answer_sheet_id = request.data.get('answer_sheet')
        try:
            sheet = AnswerSheet.objects.get(pk=answer_sheet_id, assigned_teacher=request.user)
        except AnswerSheet.DoesNotExist:
            return Response(
                {'error': 'Answer sheet not found or not assigned to you.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if already evaluated
        if hasattr(sheet, 'evaluation'):
            # Update existing evaluation
            existing = sheet.evaluation
            old_data = EvaluationResultSerializer(existing).data
            serializer.update(existing, serializer.validated_data)
            existing.refresh_from_db()

            log_action(
                request, 'EDIT_MARKS', 'EvaluationResult', existing.pk,
                old_value=old_data,
                new_value=EvaluationResultSerializer(existing).data,
                notes='Evaluation updated.'
            )

            return Response(
                EvaluationResultSerializer(existing).data,
                status=status.HTTP_200_OK
            )

        # Create new evaluation
        instance = serializer.save(
            teacher=request.user,
            pdf_version_at_grading=sheet.pdf_version,
        )

        # Update sheet status
        sheet.status = 'completed'
        sheet.save()

        log_action(
            request, 'GRADE', 'EvaluationResult', instance.pk,
            new_value=EvaluationResultSerializer(instance).data,
            notes=f'Sheet graded. Total: {instance.total_marks}.'
        )

        return Response(
            EvaluationResultSerializer(instance).data,
            status=status.HTTP_201_CREATED
        )


class EvaluationDetailView(APIView):
    """
    GET /api/evaluations/{answer_sheet_id}/
    Retrieve evaluation result for an answer sheet.
    """

    def get_permissions(self):
        return [IsTeacher() | IsExamDept()]

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

        # Teachers can only view their own evaluations
        if request.user.role == 'teacher' and result.teacher != request.user:
            return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        return Response(EvaluationResultSerializer(result).data)


class EvaluationAmendView(APIView):
    """
    PATCH /api/evaluations/{pk}/amend-marks/
    Exam Dept corrects marks post-submission.
    Sets was_amended=True and creates an audit log entry.
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

        # Validate via serializer
        serializer = EvaluationResultSerializer(
            result, data={'section_results': new_section_results,
                          'answer_sheet': result.answer_sheet_id,
                          'pdf_version_at_grading': result.pdf_version_at_grading},
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        # Capture old values for audit
        old_data = {
            'section_results': result.section_results,
            'total_marks': result.total_marks,
        }

        # Apply changes
        result.section_results = serializer.validated_data['section_results']
        result.total_marks = getattr(serializer, '_computed_total', result.total_marks)
        result.was_amended = True
        result.amended_at = timezone.now()
        result.save()

        new_data = {
            'section_results': result.section_results,
            'total_marks': result.total_marks,
        }

        log_action(
            request, 'AMEND_MARKS', 'EvaluationResult', result.pk,
            old_value=old_data,
            new_value=new_data,
            notes=f'Marks amended by Exam Dept. New total: {result.total_marks}.'
        )

        return Response(EvaluationResultSerializer(result).data, status=status.HTTP_200_OK)
