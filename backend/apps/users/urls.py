from django.urls import path
from .views import LoginView, TokenRefreshView, ChangePasswordView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
]
