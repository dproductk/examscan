import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model with role-based access.
    Roles: scanning_staff, teacher, exam_dept.
    """
    ROLE_CHOICES = [
        ('scanning_staff', 'Scanning Staff'),
        ('teacher', 'Teacher'),
        ('exam_dept', 'Exam Department'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    must_change_password = models.BooleanField(default=False)

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.full_name} ({self.role})"
