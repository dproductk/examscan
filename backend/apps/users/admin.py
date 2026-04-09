from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'full_name', 'role', 'is_active', 'must_change_password')
    list_filter = ('role', 'is_active', 'must_change_password')
    search_fields = ('username', 'email', 'full_name')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('ExamFlow', {'fields': ('role', 'full_name', 'must_change_password')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('ExamFlow', {'fields': ('role', 'full_name', 'email', 'must_change_password')}),
    )
