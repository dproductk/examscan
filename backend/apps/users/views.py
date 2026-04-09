from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView as BaseTokenRefreshView

from apps.users.permissions import IsExamDept
from utils.audit_helper import log_action
from .serializers import CustomTokenObtainPairSerializer, ChangePasswordSerializer, UserSerializer, UserCreateSerializer
from .models import User


class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Authenticates user and returns JWT tokens along with role and full_name.
    """
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Log login action — need to fetch user from credentials
            try:
                user = User.objects.get(username=request.data.get('username'))
                log_action(request, 'LOGIN', 'User', user.pk, notes=f'User {user.username} logged in.')
            except User.DoesNotExist:
                pass
        return response


class TokenRefreshView(BaseTokenRefreshView):
    """
    POST /api/auth/refresh/
    Standard JWT token refresh.
    """
    permission_classes = [AllowAny]


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Allows any authenticated user to change their password.
    Sets must_change_password to False after successful change.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.must_change_password = False
        user.save()

        log_action(
            request, 'LOGIN', 'User', user.pk,
            notes='Password changed successfully.'
        )

        return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────
# User Management Views (Exam Dept Only)
# ─────────────────────────────────────────────────────────

class UserListCreateView(generics.ListCreateAPIView):
    """
    GET /api/users/ — List all users (Exam Dept only).
    POST /api/users/ — Create a new user (Exam Dept only).
    """
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsExamDept]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs

    def perform_create(self, serializer):
        user = serializer.save()
        log_action(
            self.request, 'SCAN', 'User', user.pk,
            new_value={'username': user.username, 'role': user.role, 'full_name': user.full_name},
            notes=f'User {user.username} created with role {user.role}.'
        )


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/users/{id}/ — Retrieve a user.
    PATCH /api/users/{id}/ — Update a user.
    DELETE /api/users/{id}/ — Delete a user.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsExamDept]

    def perform_update(self, serializer):
        old_data = UserSerializer(self.get_object()).data
        user = serializer.save()
        log_action(
            self.request, 'EDIT_MARKS', 'User', user.pk,
            old_value=old_data,
            new_value=UserSerializer(user).data,
            notes=f'User {user.username} updated.'
        )

    def perform_destroy(self, instance):
        log_action(
            self.request, 'EDIT_MARKS', 'User', instance.pk,
            old_value={'username': instance.username, 'role': instance.role},
            notes=f'User {instance.username} deleted.'
        )
        instance.delete()
