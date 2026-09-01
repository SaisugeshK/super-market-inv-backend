import { NavLink } from 'react-router-dom';

const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Dashboard', end: true }],
  },
  {
    title: 'Catalog & stock',
    items: [
      { to: '/products', label: 'Products' },
      { to: '/stock', label: 'Stock' },
    ],
  },
  {
    title: 'Buying',
    items: [
      { to: '/suppliers', label: 'Suppliers' },
      { to: '/purchases', label: 'Purchases' },
    ],
  },
  {
    title: 'Billing',
    items: [
      { to: '/billing', label: 'New sale' },
      { to: '/sales', label: 'Sales' },
      { to: '/payments', label: 'Payments' },
      { to: '/billing-counters', label: 'Counters' },
      { to: '/cash-closing', label: 'Cash closing' },
    ],
  },
  {
    title: 'People',
    items: [{ to: '/users-roles', label: 'Users & roles' }],
  },
  {
    title: 'System',
    items: [{ to: '/reports', label: 'Reports' }],
  },
];

export default function Sidebar({ collapsed, onNavigate }) {
  return (
    <aside className={`erp-sidebar ${collapsed ? 'erp-sidebar-collapsed' : ''}`}>
      <div className="erp-sidebar-brand">
        <span className="erp-brand-mark">F</span>
        {!collapsed && <span>Freshmart</span>}
      </div>
      <nav className="erp-sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-1">
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
                <span className="erp-dot" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
