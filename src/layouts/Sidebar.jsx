import { NavLink } from 'react-router-dom';
import {
  FiGrid,
  FiUsers,
  FiBox,
  FiActivity,
  FiPieChart,
  FiMonitor,
  FiDollarSign,
  FiCreditCard,
  FiLayers,
  FiShoppingCart,
} from 'react-icons/fi';

const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: FiGrid, end: true }],
  },
  {
    title: 'Catalog',
    items: [{ to: '/catalog', label: 'Catalog', icon: FiBox }],
  },
  {
    title: 'People',
    items: [{ to: '/users-roles', label: 'Users & Roles', icon: FiUsers }],
  },
  {
    title: 'Billing / POS',
    items: [
      { to: '/billing', label: 'Billing / New Sale', icon: FiMonitor },
      { to: '/sales', label: 'Sales', icon: FiShoppingCart },
      { to: '/payments', label: 'Payments', icon: FiCreditCard },
      { to: '/billing-counters', label: 'Billing Counters', icon: FiMonitor },
      { to: '/cash-closing', label: 'Cash Closing', icon: FiDollarSign },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { to: '/stock', label: 'Stock Management', icon: FiLayers },
      { to: '/stock-movements', label: 'Stock Movements', icon: FiActivity },
    ],
  },
  {
    title: 'System',
    items: [{ to: '/reports', label: 'Reports', icon: FiPieChart }],
  },
];

export default function Sidebar({ collapsed, onNavigate }) {
  return (
    <aside className={`erp-sidebar ${collapsed ? 'erp-sidebar-collapsed' : ''}`}>
      <div className="erp-sidebar-brand">
        <FiGrid className="flex-shrink-0" size={22} />
        {!collapsed && <span>Supermarket ERP</span>}
      </div>
      <nav className="erp-sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-3">
            {!collapsed && <div className="erp-sidebar-group-title">{group.title}</div>}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) => `erp-sidebar-link ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={16} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
