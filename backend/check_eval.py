import os
import sys
import django
import json

sys.path.append('c:\\Users\\SARTHAK\\examscan\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'examflow_project.settings')
django.setup()

from apps.evaluation.models import EvaluationResult

evals = EvaluationResult.objects.filter(role='moderator', total_marks=31)
if evals.exists():
    ev = evals.first()
    print(json.dumps(ev.section_results, indent=2))
else:
    print("No moderator evaluation found with total_marks=31")
