import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBox,
  FiUsers,
  FiTruck,
  FiFileText,
  FiAlertTriangle,
  FiTrendingUp,
  FiShoppingCart,
  FiDollarSign,
  FiBarChart2,
  FiArrowUpRight,
  FiArrowDownRight,
} from 'react-icons/fi';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import productsService from '../services/productsService';
import customersService from '../services/customersService';
import suppliersService from '../services/suppliersService';
import invoicesService from '../services/invoicesService';
import purchasesService from '../services/purchasesService';
import salesService from '../services/salesService';
import dashboardService from '../services/dashboardService';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);

/* ─── Month helpers ─────────────────────────────────────── */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthLabel(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : MONTHS[d.getMonth()];
}

function buildMonthlyData(purchases, sales) {
  const map = {};
  MONTHS.forEach((m) => { map[m] = { month: m, purchases: 0, sales: 0 }; });

  purchases.forEach((p) => {
    const m = getMonthLabel(p.purchaseDate || p.date || p.createdAt);
    if (m) map[m].purchases += Number(p.totalAmount || p.grandTotal || p.total || 0);
  });

  sales.forEach((s) => {
    const m = getMonthLabel(s.saleDate || s.date || s.createdAt);
    if (m) map[m].sales += Number(s.totalAmount || s.grandTotal || s.total || 0);
  });

  return MONTHS.map((m) => map[m]);
}

/* ─── Custom tooltip ─────────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(20,30,26,0.97)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10,
      padding: '10px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    }}>
      <p style={{ color: '#a0b8b0', margin: '0 0 6px', fontSize: 12, fontWeight: 600 }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: entry.color, display: 'inline-block' }} />
          <span style={{ color: '#e0ede8', fontSize: 13 }}>
            {entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}: <strong style={{ color: '#fff' }}>{Number(entry.value).toLocaleString()}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, to, color, bgColor, trend }) {
  const content = (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      padding: '20px 22px',
      border: '1px solid #e8eeeb',
      boxShadow: '0 2px 12px rgba(47,111,79,0.07)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      transition: 'transform 0.18s, box-shadow 0.18s',
      height: '100%',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(47,111,79,0.14)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(47,111,79,0.07)'; }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: bgColor || 'rgba(47,111,79,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={22} color={color || '#2f6f4f'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#7a9490', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1b2e28', lineHeight: 1.1 }}>{value}</div>
      </div>
      {trend !== undefined && (
        <div style={{ fontSize: 12, color: trend >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
          {trend >= 0 ? <FiArrowUpRight size={14} /> : <FiArrowDownRight size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{content}</Link> : content;
}

/* ─── Section header ─────────────────────────────────────── */
function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: 'linear-gradient(135deg, #2f6f4f, #4a9e70)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(47,111,79,0.3)',
      }}>
        <Icon size={18} color="#fff" />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1b2e28' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#7a9490' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

/* ─── Chart card wrapper ─────────────────────────────────── */
function ChartCard({ children, style }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1px solid #e8eeeb',
      padding: '24px',
      boxShadow: '0 2px 16px rgba(47,111,79,0.07)',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export default function Dashboard() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    products: [],
    customers: [],
    suppliers: [],
    invoices: [],
    purchases: [],
    sales: [],
    summary: null,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      productsService.getAll(),
      customersService.getAll(),
      suppliersService.getAll(),
      invoicesService.getAll(),
      purchasesService.getAll().catch(() => []),
      salesService.getAll().catch(() => []),
      dashboardService.getSummary().catch(() => null),
    ])
      .then(([products, customers, suppliers, invoices, purchases, sales, summary]) => {
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          products: asList(products),
          customers: asList(customers),
          suppliers: asList(suppliers),
          invoices: asList(invoices),
          purchases: asList(purchases),
          sales: asList(sales),
          summary: summary || null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, loading: false, error }));
      });

    return () => { cancelled = true; };
  }, []);

  const { products, customers, suppliers, invoices, purchases, sales, summary } = state;

  const inr = (v) =>
    `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const monthlyData = useMemo(() => buildMonthlyData(purchases, sales), [purchases, sales]);

  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.totalAmount || p.grandTotal || p.total || 0), 0);
  const totalSales = sales.reduce((sum, s) => sum + Number(s.totalAmount || s.grandTotal || s.total || 0), 0);

  const lowStock =
    summary?.lowStockItems?.length
      ? summary.lowStockItems.map((it) => ({
          id: it.productId,
          productName: it.productName,
          stockQuantity: it.stockQuantity,
          minimumStock: it.minimumStock,
        }))
      : products.filter((p) => Number(p.stockQuantity) <= Number(p.minimumStock));
  const recentInvoices = [...invoices].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).slice(0, 6);

  /* Pie data – distribution */
  const purchaseVsSalesData = [
    { name: 'Purchases', value: totalPurchases || 1 },
    { name: 'Sales', value: totalSales || 1 },
  ];
  const PIE_COLORS = ['#3b82f6', '#10b981'];

  if (state.loading) return <Loader label="Loading dashboard..." />;
  if (state.error) return <ErrorPage message="Could not load dashboard data from the backend." />;

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, margin: 0, color: '#1b2e28' }}>Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: '#7a9490', fontSize: 13 }}>Overview of your business performance</p>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #2f6f4f, #4a9e70)',
          color: '#fff',
          borderRadius: 10,
          padding: '8px 16px',
          fontSize: 12,
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(47,111,79,0.3)',
        }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiBox} label="Products" value={products.length} to="/catalog"
            color="#2f6f4f" bgColor="rgba(47,111,79,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiUsers} label="Customers" value={customers.length} to="/billing"
            color="#3b82f6" bgColor="rgba(59,130,246,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiTruck} label="Suppliers" value={suppliers.length} to="/catalog"
            color="#f59e0b" bgColor="rgba(245,158,11,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiFileText} label="Invoices" value={invoices.length} to="/sales"
            color="#8b5cf6" bgColor="rgba(139,92,246,0.1)" />
        </div>
      </div>

      {/* ── Revenue KPI row ── */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-4">
          <StatCard icon={FiTrendingUp} label="Total Revenue (Invoiced)" value={`₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            color="#2f6f4f" bgColor="rgba(47,111,79,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-4">
          <StatCard icon={FiShoppingCart} label="Total Purchases" value={`₹${totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            color="#3b82f6" bgColor="rgba(59,130,246,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-4">
          <StatCard icon={FiDollarSign} label="Total Sales" value={`₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            color="#10b981" bgColor="rgba(16,185,129,0.1)" />
        </div>
      </div>

      {/* ── Today / outstanding KPIs (from /api/dashboard/summary) ── */}
      {summary && (
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-lg-3">
            <StatCard icon={FiDollarSign} label="Today's Sales" value={inr(summary.todayTotalSales)}
              color="#10b981" bgColor="rgba(16,185,129,0.1)" />
          </div>
          <div className="col-sm-6 col-lg-3">
            <StatCard icon={FiFileText} label="Today's Bills" value={summary.todayBillCount ?? 0}
              color="#8b5cf6" bgColor="rgba(139,92,246,0.1)" />
          </div>
          <div className="col-sm-6 col-lg-3">
            <StatCard icon={FiShoppingCart} label="Purchase Amount" value={inr(summary.totalPurchaseAmount)}
              color="#3b82f6" bgColor="rgba(59,130,246,0.1)" />
          </div>
          <div className="col-sm-6 col-lg-3">
            <StatCard icon={FiAlertTriangle} label="Supplier Pending" value={inr(summary.totalSupplierPending)}
              to="/reports" color="#f59e0b" bgColor="rgba(245,158,11,0.1)" />
          </div>
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="row g-3 mb-4">
        {/* Area chart – monthly trend */}
        <div className="col-lg-8">
          <ChartCard style={{ height: '100%' }}>
            <SectionTitle icon={FiBarChart2} title="Monthly Purchase & Sales Trend" subtitle="Revenue flow over the year" />
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#f0f4f2" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#7a9490', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7a9490', fontSize: 12 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={9}
                  wrapperStyle={{ fontSize: 13, paddingTop: 12, color: '#556b64' }}
                />
                <Area type="monotone" dataKey="purchases" name="Purchases"
                  stroke="#3b82f6" strokeWidth={2.5}
                  fill="url(#gradPurchases)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="sales" name="Sales"
                  stroke="#10b981" strokeWidth={2.5}
                  fill="url(#gradSales)" dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Pie chart – distribution */}
        <div className="col-lg-4">
          <ChartCard style={{ height: '100%' }}>
            <SectionTitle icon={FiDollarSign} title="Purchase vs Sales" subtitle="Amount distribution" />
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={purchaseVsSalesData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {purchaseVsSalesData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, name]}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e8eeeb', fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8 }}>
              {purchaseVsSalesData.map((entry, i) => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#556b64', fontWeight: 500 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i], display: 'inline-block' }} />
                  {entry.name}
                </div>
              ))}
            </div>

            {/* Mini summary */}
            <div style={{ marginTop: 18, borderTop: '1px solid #f0f4f2', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Total Purchases', value: totalPurchases, color: '#3b82f6' },
                { label: 'Total Sales', value: totalSales, color: '#10b981' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                    <span style={{ fontSize: 12, color: '#7a9490' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1b2e28' }}>
                    ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ── Bar chart – full width ── */}
      <div className="mb-4">
        <ChartCard>
          <SectionTitle icon={FiBarChart2} title="Purchases vs Sales Comparison" subtitle="Monthly side-by-side breakdown" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="4 4" stroke="#f0f4f2" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#7a9490', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7a9490', fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 13, paddingTop: 12, color: '#556b64' }} />
              <Bar dataKey="purchases" name="Purchases" fill="#3b82f6" radius={[5, 5, 0, 0]} />
              <Bar dataKey="sales" name="Sales" fill="#10b981" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Bottom row: Low Stock + Recent Invoices ── */}
      <div className="row g-3">
        <div className="col-lg-5">
          <ChartCard style={{ height: '100%' }}>
            <SectionTitle icon={FiAlertTriangle} title="Low Stock Products" subtitle="Products at or below minimum level" />
            {lowStock.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#7a9490' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <p style={{ margin: 0, fontSize: 14 }}>All products are above minimum stock level.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f0f4f2' }}>
                      {['Product', 'Stock', 'Minimum'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#7a9490', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.slice(0, 6).map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f7faf9' }}>
                        <td style={{ padding: '10px 12px', color: '#1b2e28', fontWeight: 500 }}>{p.productName}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
                            {p.stockQuantity}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#7a9490' }}>{p.minimumStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </div>

        <div className="col-lg-7">
          <ChartCard style={{ height: '100%' }}>
            <SectionTitle icon={FiFileText} title="Recent Invoices" subtitle="Latest 6 invoice records" />
            {recentInvoices.length === 0 ? (
              <p style={{ color: '#7a9490', fontSize: 14 }}>No invoices recorded yet.</p>
            ) : (
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f0f4f2' }}>
                      {['Invoice #', 'Grand Total', 'Status'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#7a9490', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f7faf9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#2f6f4f' }}>{inv.invoiceNumber}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1b2e28' }}>
                          ₹{Number(inv.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            borderRadius: 6,
                            padding: '3px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            background: inv.paymentStatus === 'PAID' ? '#d1fae5' : '#fef3c7',
                            color: inv.paymentStatus === 'PAID' ? '#065f46' : '#92400e',
                          }}>
                            {inv.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
