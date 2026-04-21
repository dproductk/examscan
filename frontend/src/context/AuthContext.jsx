import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore auth state from sessionStorage on mount
  useEffect(() => {
    const storedAccess = sessionStorage.getItem('access_token')
    const storedRefresh = sessionStorage.getItem('refresh_token')
    const storedUser = sessionStorage.getItem('user')

    if (storedAccess && storedUser) {
      setAccessToken(storedAccess)
      setRefreshToken(storedRefresh)
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        sessionStorage.clear()
      }
    }
    setLoading(false)
  }, [])

  const login = (data) => {
    const { access, refresh, user_id, role, full_name, must_change_password } = data
    const userObj = { userId: user_id, role, fullName: full_name, mustChangePassword: must_change_password }

    setAccessToken(access)
    setRefreshToken(refresh)
    setUser(userObj)

    sessionStorage.setItem('access_token', access)
    sessionStorage.setItem('refresh_token', refresh)
    sessionStorage.setItem('user', JSON.stringify(userObj))
    sessionStorage.setItem('user_role', role)
  }

  const logout = () => {
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
    sessionStorage.clear()
  }

  const value = {
    user,
    accessToken,
    refreshToken,
    loading,
    login,
    logout,
    isAuthenticated: !!accessToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
