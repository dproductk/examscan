import os
import sys
import django

sys.path.append('c:\\Users\\SARTHAK\\examscan\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'examflow_project.settings')
django.setup()

from apps.evaluation.models import ModerationPaperStatus

def fix_paper_status():
    for status in ModerationPaperStatus.objects.all():
        old_total = status.moderator_total
        # Recalculate from the moderator evaluation
        try:
            from apps.evaluation.models import EvaluationResult
            mod_eval = EvaluationResult.objects.get(answer_sheet_id=status.sample.answer_sheet_id, role='moderator')
            if mod_eval.total_marks != old_total:
                status.moderator_total = mod_eval.total_marks
                # re-run passing logic
                status.status = 'PASSED' if status.assessor_total == status.moderator_total else 'FAILED'
                status.save(update_fields=['moderator_total', 'status'])
                print(f"Fixed ModerationPaperStatus {status.id}: {old_total} -> {status.moderator_total} (Status: {status.status})")
        except Exception as e:
            print(f"Skipping {status.id}: {e}")

if __name__ == '__main__':
    fix_paper_status()
