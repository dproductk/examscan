import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { login as loginApi } from '../../api/auth'
import LoadingSpinner from '../../components/LoadingSpinner'

function ExamLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await loginApi({ username, password })

      if (data.role !== 'exam_dept') {
        setError('This portal is for the Exam Department only.')
        setLoading(false)
        return
      }

      login(data)
      navigate('/exam/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card card card-glass">
        <h1>ExamFlow</h1>
        <p className="subtitle">Exam Department Portal</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="exam-username">Username</label>
            <input
              id="exam-username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="exam-password">Password</label>
            <input
              id="exam-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="toast toast-error mb-md">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={loading}
            id="exam-login-btn"
          >
            {loading ? <LoadingSpinner size={20} /> : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a href="/login/scanning" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            Scanning Staff Login
          </a>
          <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>•</span>
          <a href="/login/teacher" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            Teacher Login
          </a>
        </div>
      </div>
    </div>
  )
}

export default ExamLogin
