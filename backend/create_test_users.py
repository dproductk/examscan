"""
Seed script: creates 3 users for each role (scanning_staff, teacher, exam_dept).
Run with: python create_test_users.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'examflow_project.settings')
django.setup()

from apps.users.models import User  # noqa: E402

USERS = [
    # --- Scanning Staff ---
    dict(username='scan1',  full_name='Alice Scanner',   email='scan1@examflow.dev',  role='scanning_staff', password='Scan@1234'),
    dict(username='scan2',  full_name='Bob Scanner',     email='scan2@examflow.dev',  role='scanning_staff', password='Scan@1234'),
    dict(username='scan3',  full_name='Carol Scanner',   email='scan3@examflow.dev',  role='scanning_staff', password='Scan@1234'),
    # --- Teachers ---
    dict(username='teach1', full_name='David Teacher',   email='teach1@examflow.dev', role='teacher',        password='Teach@1234'),
    dict(username='teach2', full_name='Eva Teacher',     email='teach2@examflow.dev', role='teacher',        password='Teach@1234'),
    dict(username='teach3', full_name='Frank Teacher',   email='teach3@examflow.dev', role='teacher',        password='Teach@1234'),
    # --- Exam Department ---
    dict(username='exam1',  full_name='Grace ExamDept',  email='exam1@examflow.dev',  role='exam_dept',      password='Exam@1234'),
    dict(username='exam2',  full_name='Henry ExamDept',  email='exam2@examflow.dev',  role='exam_dept',      password='Exam@1234'),
    dict(username='exam3',  full_name='Irene ExamDept',  email='exam3@examflow.dev',  role='exam_dept',      password='Exam@1234'),
]

created, skipped = 0, 0
for u in USERS:
    if User.objects.filter(username=u['username']).exists():
        print(f"  [SKIP] {u['username']} already exists")
        skipped += 1
        continue
    user = User(
        username=u['username'],
        full_name=u['full_name'],
        email=u['email'],
        role=u['role'],
        must_change_password=False,
    )
    user.set_password(u['password'])
    user.save()
    print(f"  [OK]   {u['username']} ({u['role']}) created")
    created += 1

print(f"\nDone — {created} created, {skipped} skipped.")
