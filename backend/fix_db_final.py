import os
import sys
import django

sys.path.append('c:\\Users\\SARTHAK\\examscan\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'examflow_project.settings')
django.setup()

from apps.evaluation.models import EvaluationResult, CriticalAssessmentVerification, ModerationPaperStatus
from apps.evaluation.serializers import EvaluationResultSerializer

def fix_all():
    evals = EvaluationResult.objects.filter(role='moderator')
    for ev in evals:
        old_total = ev.total_marks
        serializer = EvaluationResultSerializer(
            instance=ev,
            data={
                'section_results': ev.section_results,
                'answer_sheet': ev.answer_sheet_id,
                'role': ev.role,
                'pdf_version_at_grading': ev.pdf_version_at_grading,
            },
            partial=True
        )
        if serializer.is_valid():
            new_total = getattr(serializer, '_computed_total', old_total)
            if new_total != old_total:
                ev.total_marks = new_total
                ev.save(update_fields=['total_marks'])
                print(f"Fixed EvaluationResult {ev.id}: {old_total} -> {new_total}")
        else:
            print(f"Serializer errors on EV {ev.id}:", serializer.errors)
            
    verifications = CriticalAssessmentVerification.objects.all()
    for v in verifications:
        old_total = v.moderator_total
        # We don't have an instance for the serializer since it expects EvaluationResult, 
        # but we can use the same EvaluationResult instance as above
        ev = EvaluationResult.objects.filter(answer_sheet_id=v.moderation_sample.answer_sheet_id, role='moderator').first()
        serializer = EvaluationResultSerializer(
            instance=ev,
            data={
                'section_results': v.moderator_section_results,
                'answer_sheet': v.moderation_sample.answer_sheet_id,
                'role': 'moderator',
                'pdf_version_at_grading': 1,
            },
            partial=True
        )
        if serializer.is_valid():
            new_total = getattr(serializer, '_computed_total', old_total)
            if new_total != old_total:
                v.moderator_total = new_total
                v.save(update_fields=['moderator_total'])
                print(f"Fixed CriticalAssessmentVerification {v.id}: {old_total} -> {new_total}")
                
    for status in ModerationPaperStatus.objects.all():
        old_total = status.moderator_total
        try:
            mod_eval = EvaluationResult.objects.get(answer_sheet_id=status.sample.answer_sheet_id, role='moderator')
            if mod_eval.total_marks != old_total:
                status.moderator_total = mod_eval.total_marks
                status.status = 'PASSED' if status.assessor_total == status.moderator_total else 'FAILED'
                status.save(update_fields=['moderator_total', 'status'])
                print(f"Fixed ModerationPaperStatus {status.id}: {old_total} -> {status.moderator_total} (Status: {status.status})")
        except Exception as e:
            pass

if __name__ == '__main__':
    fix_all()
