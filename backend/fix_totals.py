import os
import sys
import django

sys.path.append('c:\\Users\\SARTHAK\\examscan\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'examflow_project.settings')
django.setup()

from apps.evaluation.models import EvaluationResult, CriticalAssessmentVerification
from apps.evaluation.serializers import EvaluationResultSerializer

def fix_totals():
    evals = EvaluationResult.objects.filter(role='moderator')
    fixed_count = 0
    for ev in evals:
        old_total = ev.total_marks
        serializer = EvaluationResultSerializer(data={'section_results': ev.section_results}, partial=True)
        if serializer.is_valid():
            new_total = getattr(serializer, '_computed_total', old_total)
            if new_total != old_total:
                ev.total_marks = new_total
                ev.save(update_fields=['total_marks'])
                fixed_count += 1
                print(f"Fixed EvaluationResult {ev.id}: {old_total} -> {new_total}")
    
    verifications = CriticalAssessmentVerification.objects.all()
    for v in verifications:
        old_total = v.moderator_total
        serializer = EvaluationResultSerializer(data={'section_results': v.moderator_section_results}, partial=True)
        if serializer.is_valid():
            new_total = getattr(serializer, '_computed_total', old_total)
            if new_total != old_total:
                v.moderator_total = new_total
                v.save(update_fields=['moderator_total'])
                print(f"Fixed CriticalAssessmentVerification {v.id}: {old_total} -> {new_total}")

if __name__ == '__main__':
    fix_totals()
