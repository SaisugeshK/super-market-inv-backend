import { NavLink } from 'react-router-dom';
import {
  FiGrid,
  FiUsers,
  FiUserCheck,
  FiTruck,
  FiTag,
  FiBox,
  FiBarChart2 as FiBarcode,
  FiShoppingCart,
  FiRotateCcw,
  FiFileText,
  FiRepeat,
  FiActivity,
  FiPieChart,
  FiSettings,
  FiShield,
  FiCreditCard,
  FiPause,
  FiMonitor,
  FiDollarSign,
} from 'react-icons/fi';

const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: FiGrid, end: true }],
  },
  {
    title: 'Catalog',
    items: [
      { to: '/categories', label: 'Categories', icon: FiTag },
      { to: '/products', label: 'Products', icon: FiBox },
      { to: '/barcodes', label: 'Barcodes', icon: FiBarcode },
      { to: '/units', label: 'Units', icon: FiRepeat },
      { to: '/product-taxes', label: 'Product Taxes', icon: FiDollarSign },
    ],
  },
  {
    title: 'People',
    items: [
      { to: '/customers', label: 'Customers', icon: FiUserCheck },
      { to: '/suppliers', label: 'Suppliers', icon: FiTruck },
      { to: '/users', label: 'Users', icon: FiUsers },
      { to: '/roles', label: 'Roles', icon: FiShield },
    ],
  },
  {
    title: 'Purchasing',
    items: [
      { to: '/purchases', label: 'Purchases', icon: FiShoppingCart },
      { to: '/purchase-items', label: 'Purchase Items', icon: FiFileText },
      { to: '/purchase-returns', label: 'Purchase Returns', icon: FiRotateCcw },
      { to: '/purchase-return-items', label: 'Purchase Return Items', icon: FiFileText },
    ],
  },
  {
    title: 'Billing / POS',
    items: [
      { to: '/pos', label: 'Point of Sale', icon: FiMonitor },
      { to: '/invoices', label: 'Invoices', icon: FiFileText },
      { to: '/invoice-items', label: 'Invoice Items', icon: FiFileText },
      { to: '/sales', label: 'Sales', icon: FiShoppingCart },
      { to: '/sales-items', label: 'Sales Items', icon: FiFileText },
      { to: '/sales-returns', label: 'Sales Returns', icon: FiRotateCcw },
      { to: '/sales-return-items', label: 'Sales Return Items', icon: FiFileText },
      { to: '/hold-invoices', label: 'Hold Invoices', icon: FiPause },
      { to: '/payments', label: 'Payments', icon: FiCreditCard },
      { to: '/billing-counters', label: 'Billing Counters', icon: FiMonitor },
      { to: '/cash-closing', label: 'Cash Closing', icon: FiDollarSign },
    ],
  },
  {
    title: 'Inventory',
    items: [{ to: '/stock-movements', label: 'Stock Movements', icon: FiActivity }],
  },
  {
    title: 'System',
    items: [
      { to: '/reports', label: 'Reports', icon: FiPieChart },
      { to: '/settings', label: 'Settings', icon: FiSettings },
    ],
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
                className={({ isActive }) =>
                  `erp-sidebar-link ${isActive ? 'active' : ''}`
                }
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
