import os
import sys
import django
import json

sys.path.append('c:\\Users\\SARTHAK\\examscan\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'examflow_project.settings')
django.setup()

from apps.evaluation.models import EvaluationResult
from apps.evaluation.serializers import EvaluationResultSerializer

ev = EvaluationResult.objects.filter(role='moderator', total_marks=31).first()
if ev:
    serializer = EvaluationResultSerializer(data={'section_results': ev.section_results}, partial=True)
    if serializer.is_valid():
        print(f"Computed total is: {serializer._computed_total}")
    else:
        print("Serializer errors:", serializer.errors)
