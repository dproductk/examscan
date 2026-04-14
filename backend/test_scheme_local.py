import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'examflow_project.settings')
django.setup()

from apps.scanning.serializers import MarkingSchemeSerializer
from apps.scanning.models import Subject

# Setup subject
subject, _ = Subject.objects.get_or_create(
    subject_code="TEST1",
    defaults={"subject_name": "Test", "department": "Test", "semester": 1}
)

payload = {
    "subject": subject.id,
    "sections": [
        {
            "name": "Q1",
            "rule": "all",
            "rule_count": None,
            "sub_questions": [
                {
                    "name": "Q1A",
                    "rule": "all",
                    "rule_count": None,
                    "parts": [
                        {"name": "1", "max_marks": 10}
                    ]
                }
            ]
        }
    ]
}

serializer = MarkingSchemeSerializer(data=payload)
if serializer.is_valid():
    try:
        serializer.save()
        print("Success! Total marks:", serializer.instance.total_marks)
    except Exception as e:
        print("Error saving:", e)
else:
    print("Validation Error:", serializer.errors)
