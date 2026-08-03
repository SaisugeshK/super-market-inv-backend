import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import GlobalLoadingBar from '../components/GlobalLoadingBar';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="erp-app-shell">
      <GlobalLoadingBar />
      <Sidebar collapsed={collapsed} />
      <div className="erp-main">
        <Navbar onToggleSidebar={() => setCollapsed((c) => !c)} />
        <main className="erp-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
