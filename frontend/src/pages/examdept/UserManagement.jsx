import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/users';
import LoadingSpinner from '../../components/LoadingSpinner';

const ROLE_MAP = {
  exam_dept: 'Exam Dept',
  scanning_staff: 'Scanning Staff',
  teacher: 'Teacher',
};

const ROLE_FILTER_MAP = {
  'All': '',
  'Teachers': 'teacher',
  'Scanning Staff': 'scanning_staff',
  'Exam Dept': 'exam_dept',
};

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '', email: '', full_name: '', role: 'teacher', password: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirmation
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Message toast
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      const roleFilter = ROLE_FILTER_MAP[activeTab];
      if (roleFilter) params.role = roleFilter;
      const { data } = await getUsers(params);
      setUsers(data.results || data);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load users.' });
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ username: '', email: '', full_name: '', role: 'teacher', password: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      password: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (editingUser) {
        // Update — only send changed fields, exclude password if empty
        const payload = {
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
        };
        await updateUser(editingUser.id, payload);
        setMessage({ type: 'success', text: `User "${formData.username}" updated.` });
      } else {
        // Create
        if (!formData.password || formData.password.length < 8) {
          setFormError('Password must be at least 8 characters.');
          setFormLoading(false);
          return;
        }
        await createUser(formData);
        setMessage({ type: 'success', text: `User "${formData.username}" created.` });
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      const errData = err.response?.data;
      if (typeof errData === 'object') {
        const msgs = Object.entries(errData)
          .map(([field, val]) => `${field}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join('; ');
        setFormError(msgs);
      } else {
        setFormError('Operation failed.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);
    try {
      await deleteUser(deletingUser.id);
      setMessage({ type: 'success', text: `User "${deletingUser.username}" deleted.` });
      setDeletingUser(null);
      fetchUsers();
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete user.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const getRoleStyle = (role) => {
    switch (role) {
      case 'exam_dept': return { color: '#B45309', background: 'rgba(245,158,11,0.1)', padding: '4px 12px', borderRadius: '20px', fontWeight: 600, fontSize: '0.8rem' };
      case 'scanning_staff': return { color: '#059669', background: 'rgba(16,185,129,0.1)', padding: '4px 12px', borderRadius: '20px', fontWeight: 600, fontSize: '0.8rem' };
      case 'teacher': return { color: '#2563EB', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 12px', borderRadius: '20px', fontWeight: 600, fontSize: '0.8rem' };
      default: return {};
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'exam_dept': return '🏛️';
      case 'scanning_staff': return '🖨️';
      case 'teacher': return '🧑‍🏫';
      default: return '👤';
    }
  };

  const stats = {
    total: users.length,
    teachers: users.filter(u => u.role === 'teacher').length,
    scanning: users.filter(u => u.role === 'scanning_staff').length,
    examDept: users.filter(u => u.role === 'exam_dept').length,
  };

  // Clear message after 4s
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Manage staff, teachers, scanning staff, and admin accounts.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal} id="add-user-btn">
          + Add User
        </button>
      </div>

      {/* Toast message */}
      {message.text && (
        <div className={`toast ${message.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ marginBottom: '1rem' }}>
          {message.text}
        </div>
      )}

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card stat-card" style={{ padding: '1rem' }}>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#4F46E5', fontSize: '1.2rem', width: '40px', height: '40px' }}>👥</div>
          <div className="stat-content">
            <div className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.total}</div>
            <div className="stat-label" style={{ fontSize: '0.75rem' }}>Total Users</div>
          </div>
        </div>
        <div className="card stat-card" style={{ padding: '1rem' }}>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#2563EB', fontSize: '1.2rem', width: '40px', height: '40px' }}>🧑‍🏫</div>
          <div className="stat-content">
            <div className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.teachers}</div>
            <div className="stat-label" style={{ fontSize: '0.75rem' }}>Teachers</div>
          </div>
        </div>
        <div className="card stat-card" style={{ padding: '1rem' }}>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: '1.2rem', width: '40px', height: '40px' }}>🖨️</div>
          <div className="stat-content">
            <div className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.scanning}</div>
            <div className="stat-label" style={{ fontSize: '0.75rem' }}>Scanning Staff</div>
          </div>
        </div>
        <div className="card stat-card" style={{ padding: '1rem' }}>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#B45309', fontSize: '1.2rem', width: '40px', height: '40px' }}>🏛️</div>
          <div className="stat-content">
            <div className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.examDept}</div>
            <div className="stat-label" style={{ fontSize: '0.75rem' }}>Exam Dept</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {['All', 'Teachers', 'Scanning Staff', 'Exam Dept'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: 'none',
              background: activeTab === tab ? '#1A1D27' : 'transparent',
              color: activeTab === tab ? '#FFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.85rem'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Users table */}
      {loading ? (
        <LoadingSpinner message="Loading users..." />
      ) : (
        <div className="table-container" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: '#FFF' }}>
          <table>
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                      {getRoleIcon(u.role)}
                    </div>
                    {u.full_name}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{u.username}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{u.email}</td>
                  <td>
                    <span style={getRoleStyle(u.role)}>
                      {ROLE_MAP[u.role] || u.role}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ border: '1px solid var(--border-color)', marginRight: '8px' }}
                      onClick={() => openEditModal(u)}
                      id={`edit-user-${u.id}`}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ border: '1px solid #FEE2E2', color: '#EF4444', background: '#FEF2F2' }}
                      onClick={() => setDeletingUser(u)}
                      id={`delete-user-${u.id}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Create User'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  id="user-fullname-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  id="user-username-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  id="user-email-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  id="user-role-select"
                >
                  <option value="teacher">Teacher</option>
                  <option value="scanning_staff">Scanning Staff</option>
                  <option value="exam_dept">Exam Department</option>
                </select>
              </div>
              {!editingUser && (
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    id="user-password-input"
                  />
                </div>
              )}
              {formError && <div className="toast toast-error" style={{ marginBottom: '1rem' }}>{formError}</div>}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading} id="user-submit-btn">
                  {formLoading ? <LoadingSpinner size={16} /> : (editingUser ? 'Save Changes' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="modal-backdrop" onClick={() => setDeletingUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2>Delete User</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeletingUser(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Are you sure you want to delete <strong>{deletingUser.full_name}</strong> ({deletingUser.username})?
              This action cannot be undone.
            </p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeletingUser(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                style={{ background: '#EF4444', color: '#FFF', border: 'none' }}
                onClick={handleDelete}
                disabled={deleteLoading}
                id="confirm-delete-btn"
              >
                {deleteLoading ? <LoadingSpinner size={16} /> : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
