import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'examflow_project.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from apps.evaluation.views import MarkingSchemeListCreateView
from apps.users.models import User

factory = APIRequestFactory()

user = User.objects.filter(role='exam_dept').first()
if not user:
    user = User.objects.create(username='admin', role='exam_dept')

payload = {
    "subject_name": "Test Save",
    "subject_code": "TS999",
    "department": "Engineering",
    "semester": 1,
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

request = factory.post('/api/schemes/', payload, format='json')
request.user = user
view = MarkingSchemeListCreateView.as_view()

response = view(request)
print("Response STATUS:", response.status_code)
print("Response DATA:", response.data)
