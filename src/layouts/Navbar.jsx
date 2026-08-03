import { FiMenu, FiLogOut, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="erp-navbar">
      <button
        className="btn btn-light border-0"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <FiMenu size={20} />
      </button>

      <div className="ms-auto d-flex align-items-center gap-3">
        <div className="d-flex align-items-center gap-2 text-secondary">
          <FiUser />
          <span className="small">{user?.username || user?.email || 'User'}</span>
        </div>
        <button className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1" onClick={handleLogout}>
          <FiLogOut size={14} /> Logout
        </button>
      </div>
    </header>
  );
}
