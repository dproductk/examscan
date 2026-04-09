import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import SidebarLayout from '../components/SidebarLayout'

const LOGIN_PATHS = {
  scanning_staff: '/login/scanning',
  teacher: '/login/teacher',
  exam_dept: '/login/exam-dept',
}

const DASHBOARD_PATHS = {
  scanning_staff: '/scanning/session',
  teacher: '/teacher/dashboard',
  exam_dept: '/exam/dashboard',
}

function ProtectedRoute({ children, allowedRole, disableLayout = false }) {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="spinner-overlay" style={{ minHeight: '100vh' }}>
        <LoadingSpinner />
      </div>
    )
  }

  // Not authenticated — redirect to role-specific login
  if (!isAuthenticated || !user) {
    return <Navigate to={LOGIN_PATHS[allowedRole] || '/login/scanning'} replace />
  }

  // Authenticated but wrong role — redirect to correct portal
  if (user.role !== allowedRole) {
    return <Navigate to={DASHBOARD_PATHS[user.role] || '/'} replace />
  }

  if (disableLayout) {
    return children;
  }

  return <SidebarLayout>{children}</SidebarLayout>
}

export default ProtectedRoute
