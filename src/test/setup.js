import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// CI machines under parallel load need more than the 1s default.
configure({ asyncUtilTimeout: 4000 });

// In the real app the axios response interceptor consumes every rejected
// request (it shows a toast) so a page's un-".catch()"-ed load promise is
// never an unhandled rejection at runtime. The mocked axios has no such
// interceptor, so swallow those same request-shaped rejections here to keep
// the error-path tests clean.
const isHandledRequestError = (reason) =>
  reason && typeof reason === 'object' && ('response' in reason || (reason.config && 'url' in reason.config));
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason) => {
    if (!isHandledRequestError(reason)) throw reason;
  });
}

// ── jsdom shims the app's libraries expect ──────────────────────────────
window.matchMedia = window.matchMedia || ((query) => ({
  matches: false, media: query, onchange: null,
  addListener: vi.fn(), removeListener: vi.fn(),
  addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
}));
window.scrollTo = window.scrollTo || vi.fn();
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}
// recharts' ResponsiveContainer measures its parent; jsdom reports 0×0.
window.ResizeObserver = class {
  observe() { /* no-op */ }
  unobserve() { /* no-op */ }
  disconnect() { /* no-op */ }
};
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
window.print = vi.fn();

// ── Fail any test that logs a React error or warning ────────────────────
// This is what enforces the step's "zero console warnings/errors" bar.
const IGNORE = [
  /React Router Future Flag Warning/, // router v7 opt-in notices, not app bugs
  /Not implemented: HTMLCanvasElement/, // jsdom canvas (jspdf), never hit in these tests
];
let consoleErrors = [];
let consoleWarns = [];
let realError;
let realWarn;

beforeEach(() => {
  try { window.localStorage.clear(); window.sessionStorage.clear(); } catch { /* jsdom */ }
  consoleErrors = [];
  consoleWarns = [];
  realError = console.error;
  realWarn = console.warn;
  console.error = (...args) => {
    const msg = args.join(' ');
    if (!IGNORE.some((re) => re.test(msg))) consoleErrors.push(msg);
    realError(...args);
  };
  console.warn = (...args) => {
    const msg = args.join(' ');
    if (!IGNORE.some((re) => re.test(msg))) consoleWarns.push(msg);
    realWarn(...args);
  };
});

afterEach(() => {
  cleanup();
  const errs = consoleErrors;
  const warns = consoleWarns;
  console.error = realError;
  console.warn = realWarn;
  if (errs.length) {
    throw new Error(`Test produced ${errs.length} console.error call(s):\n- ${errs.join('\n- ')}`);
  }
  if (warns.length) {
    throw new Error(`Test produced ${warns.length} console.warn call(s):\n- ${warns.join('\n- ')}`);
  }
});

// Silence react-hot-toast (it renders a portal + timers we don't assert on here).
vi.mock('react-hot-toast', () => {
  const fn = vi.fn();
  const toast = Object.assign(fn, { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn(), custom: vi.fn() });
  return { __esModule: true, default: toast, toast, Toaster: () => null };
});

// Every service module goes through src/api/axios.js — swap it for the
// in-memory fake so tests drive responses and no real network is touched.
vi.mock('../api/axios', async () => {
  const mod = await import('./apiMock.js');
  return {
    __esModule: true,
    default: mod.default,
    tokenStorage: mod.tokenStorage,
    subscribeToLoading: mod.subscribeToLoading,
  };
});

// recharts needs real layout; in jsdom it renders nothing and warns. The
// Dashboard test asserts on the stat cards / tables, not the SVG paths.
vi.mock('recharts', () => {
  const Null = () => null;
  const names = ['ResponsiveContainer', 'PieChart', 'BarChart', 'AreaChart', 'LineChart', 'ComposedChart',
    'Pie', 'Bar', 'Area', 'Line', 'Cell', 'XAxis', 'YAxis', 'ZAxis', 'CartesianGrid',
    'Tooltip', 'Legend', 'ReferenceLine', 'LabelList'];
  return { __esModule: true, ...Object.fromEntries(names.map((n) => [n, Null])) };
});
