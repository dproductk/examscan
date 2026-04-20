import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './SidebarLayout.css';

function SidebarLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Define navigation based on user role
  const getNavLinks = () => {
    const role = user?.role || '';
    if (role === 'exam_dept') {
      return [
        { label: 'Dashboard', path: '/exam/dashboard', icon: '🎛️' },
        { label: 'Users', path: '/exam/users', icon: '👥' },
        { label: 'Assign Teachers', path: '/exam/assign', icon: '🧑‍🏫' },
        { label: 'Subjects & Schemes', path: '/exam/schemes', icon: '📚' },
        { label: 'Token Manager', path: '/exam/tokens', icon: '🏷️' },
        { label: 'Reports', path: '/exam/reports', icon: '📊' },
      ];
    } else if (role === 'scanning_staff') {
      return [
        { label: 'New Bundle', path: '/scanning/session', icon: '📦' },
        ...(!location.pathname.includes('/scanning/session') && location.pathname.includes('/scanning') 
            ? [{ label: 'Scanner Tools', path: location.pathname, icon: '🖨️' }] : [])
      ];
    } else if (role === 'teacher') {
      return [
        { label: 'Dashboard', path: '/teacher/dashboard', icon: '🎛️' },
      ];
    }
    return [];
  };

  const navLinks = getNavLinks();

  // Helper to format role nicely
  const formatRole = (roleStr) => {
    if (!roleStr) return '';
    return roleStr.replace('_', ' ').toUpperCase();
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo Area */}
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🎓</span> 
            <span className="logo-text">ExamFlow</span>
          </div>
        </div>

        {/* Navigation Area */}
        <nav className="sidebar-nav">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{link.icon}</span>
                <span className="nav-label">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Area */}
        <div className="sidebar-footer">
          <div className="user-meta">
            <span className="user-role">{formatRole(user?.role)}</span>
            <span className="user-name">{user?.fullName || user?.username || 'User'}</span>
          </div>
          <button className="sign-out-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default SidebarLayout;
