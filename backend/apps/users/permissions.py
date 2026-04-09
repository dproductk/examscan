from rest_framework.permissions import BasePermission


class IsScanningStaff(BasePermission):
    """Allows access only to users with the 'scanning_staff' role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'scanning_staff'
        )


class IsTeacher(BasePermission):
    """Allows access only to users with the 'teacher' role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'teacher'
        )


class IsExamDept(BasePermission):
    """Allows access only to users with the 'exam_dept' role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'exam_dept'
        )
