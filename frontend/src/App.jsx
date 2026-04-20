import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'

// Scanning portal
import ScanLogin from './pages/scanning/ScanLogin'
import SessionCreate from './pages/scanning/SessionCreate'
import ImageUpload from './pages/scanning/ImageUpload'
import BundleReview from './pages/scanning/BundleReview'
import ReviewScreen from './pages/scanning/ReviewScreen'

// Teacher portal
import TeacherLogin from './pages/teacher/TeacherLogin'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import EvaluationScreen from './pages/teacher/EvaluationScreen'

// Exam dept portal
import ExamLogin from './pages/examdept/ExamLogin'
import ExamDashboard from './pages/examdept/ExamDashboard'
import AssignTeacher from './pages/examdept/AssignTeacher'
import SchemeManager from './pages/examdept/SchemeManager'
import AmendmentManager from './pages/examdept/AmendmentManager'
import AuditLog from './pages/examdept/AuditLog'
import Reports from './pages/examdept/Reports'
import TokenManager from './pages/examdept/TokenManager'
import UserManagement from './pages/examdept/UserManagement'

function App() {
  return (
    <Routes>
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login/scanning" replace />} />

      {/* ── Scanning Portal ───────────────── */}
      <Route path="/login/scanning" element={<ScanLogin />} />
      <Route
        path="/scanning/session"
        element={
          <ProtectedRoute allowedRole="scanning_staff">
            <SessionCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scanning/upload/:bundleId"
        element={
          <ProtectedRoute allowedRole="scanning_staff">
            <ImageUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scanning/review/:bundleId"
        element={
          <ProtectedRoute allowedRole="scanning_staff">
            <BundleReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scan/submit/:bundleId"
        element={
          <ProtectedRoute allowedRole="scanning_staff">
            <ReviewScreen />
          </ProtectedRoute>
        }
      />

      {/* ── Teacher Portal ────────────────── */}
      <Route path="/login/teacher" element={<TeacherLogin />} />
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute allowedRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/evaluate/:id"
        element={
          <ProtectedRoute allowedRole="teacher" disableLayout={true}>
            <EvaluationScreen />
          </ProtectedRoute>
        }
      />

      {/* ── Exam Dept Portal ──────────────── */}
      <Route path="/login/exam-dept" element={<ExamLogin />} />
      <Route
        path="/exam/dashboard"
        element={
          <ProtectedRoute allowedRole="exam_dept">
            <ExamDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam/assign"
        element={
          <ProtectedRoute allowedRole="exam_dept">
            <AssignTeacher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam/users"
        element={
          <ProtectedRoute allowedRole="exam_dept">
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam/schemes"
        element={
          <ProtectedRoute allowedRole="exam_dept">
            <SchemeManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam/amendments"
        element={
          <ProtectedRoute allowedRole="exam_dept">
            <AmendmentManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam/audit-log"
        element={
          <ProtectedRoute allowedRole="exam_dept">
            <AuditLog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam/reports"
        element={
          <ProtectedRoute allowedRole="exam_dept">
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam/tokens"
        element={
          <ProtectedRoute allowedRole="exam_dept">
            <TokenManager />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
