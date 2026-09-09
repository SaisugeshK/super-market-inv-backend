import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import GlobalLoadingBar from '../components/GlobalLoadingBar';
import { useAuth } from '../context/AuthContext';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  return (
    <div className="erp-app-shell">
      <GlobalLoadingBar />
      <Sidebar collapsed={collapsed} role={user?.roleName} />
      <div className="erp-main">
        <Navbar onToggleSidebar={() => setCollapsed((c) => !c)} />
        <main className="erp-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
