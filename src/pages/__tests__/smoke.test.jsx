import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderPage, userEvent } from '../../test/render';
import { resetApiMock, onGet, onPost } from '../../test/apiMock';

import toast from 'react-hot-toast';

import Login from '../Login';
import NotFound from '../NotFound';
import ErrorPage from '../ErrorPage';
import SalesHub from '../SalesHub';
import UsersRoles from '../UsersRoles';
import GlobalLoadingBar from '../../components/GlobalLoadingBar';

// Every remaining routed page — a render smoke test that fails on any
// crash or console warning (the setup guard enforces the latter).
import Customers from '../Customers';
import Barcodes from '../Barcodes';
import ProductTaxes from '../ProductTaxes';
import Categories from '../Categories';
import Units from '../Units';
import Roles from '../Roles';
import Settings from '../Settings';
import Users from '../Users';
import Payments from '../Payments';
import Invoices from '../Invoices';
import InvoiceItems from '../InvoiceItems';
import HoldInvoices from '../HoldInvoices';
import SalesItems from '../SalesItems';
import SalesReturns from '../SalesReturns';
import SalesReturnItems from '../SalesReturnItems';
import PurchaseItems from '../PurchaseItems';
import PurchaseReturns from '../PurchaseReturns';
import PurchaseReturnItems from '../PurchaseReturnItems';

beforeEach(() => {
  resetApiMock();
  vi.clearAllMocks();
  // generous default responses for every reference lookup these pages make
  onGet(/./, []);
});

describe('Login', () => {
  it('renders the sign-in form', () => {
    renderPage(<Login />, { route: '/login', path: '/login', user: null });
    expect(screen.getByText('Supermarket ERP')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
  });

  it('validates required email + password', async () => {
    const user = userEvent.setup();
    renderPage(<Login />, { route: '/login', path: '/login', user: null });
    // no user seeded -> not authenticated -> form shown
    await user.click(screen.getByRole('button', { name: /Sign In/i }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('logs in and stores the session on success', async () => {
    onPost('/auth/login', () => ({ token: 'jwt-abc', userId: 7, username: 'sam', email: 'sam@erp.local', roleName: 'ADMIN' }));
    const user = userEvent.setup();
    renderPage(<Login />, { route: '/login', path: '/login', user: null });
    await user.type(screen.getByLabelText(/Email/), 'sam@erp.local');
    await user.type(screen.getByLabelText(/Password/), 'secret1');
    await user.click(screen.getByRole('button', { name: /Sign In/i }));
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Logged in successfully'));
  });

  it('shows an error toast on bad credentials', async () => {
    onPost('/auth/login', () => ({ __error: true, status: 401, message: 'Bad credentials' }));
    const user = userEvent.setup();
    renderPage(<Login />, { route: '/login', path: '/login', user: null });
    await user.type(screen.getByLabelText(/Email/), 'x@y.z');
    await user.type(screen.getByLabelText(/Password/), 'nope12');
    await user.click(screen.getByRole('button', { name: /Sign In/i }));
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});

describe('static pages', () => {
  it('NotFound renders a 404', () => {
    renderPage(<NotFound />);
    expect(screen.getByText(/404/)).toBeInTheDocument();
  });
  it('ErrorPage shows the passed message', () => {
    renderPage(<ErrorPage message="Kaboom" />);
    expect(screen.getByText('Kaboom')).toBeInTheDocument();
  });
});

describe('GlobalLoadingBar', () => {
  it('renders nothing while idle', () => {
    const { container } = renderPage(<GlobalLoadingBar />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('hub pages', () => {
  it('SalesHub shows its tab strip', async () => {
    renderPage(<SalesHub />);
    expect(await screen.findByRole('button', { name: /Sales Items/ })).toBeInTheDocument();
  });
  it('UsersRoles shows its tab strip', async () => {
    onGet(/\/roles$/, []);
    onGet(/\/users$/, []);
    renderPage(<UsersRoles />);
    expect(await screen.findByRole('heading', { name: /Users/i })).toBeInTheDocument();
  });
});

describe('legacy CRUD screens render without crashing', () => {
  // Each waits for a settled marker so the page's async load finishes inside act().
  const cases = [
    ['Customers', <Customers />, /No customers yet/i],
    ['Barcodes', <Barcodes />, /No product barcodes yet/i],
    ['ProductTaxes', <ProductTaxes />, /No product taxes yet/i],
    ['Categories', <Categories />, /No categories yet/i],
    ['Units', <Units />, /No units yet/i],
    ['Roles', <Roles />, /No roles yet/i],
    ['Settings', <Settings />, /No settings yet/i],
    ['Users', <Users />, /No users yet/i],
    ['InvoiceItems', <InvoiceItems />, /No invoice items yet/i],
    ['HoldInvoices', <HoldInvoices />, /No hold invoices yet|held/i],
    ['SalesItems', <SalesItems />, /No sales items yet/i],
    ['SalesReturns', <SalesReturns />, /No sales returns yet/i],
    ['SalesReturnItems', <SalesReturnItems />, /No sales return items yet/i],
    ['PurchaseItems', <PurchaseItems />, /No purchase items yet/i],
    ['PurchaseReturnItems', <PurchaseReturnItems />, /No purchase return items yet/i],
    ['Payments', <Payments />, /Payments/],
    ['Invoices', <Invoices />, /No invoices yet|Invoices/],
    ['PurchaseReturns', <PurchaseReturns />, /Purchase Returns/],
  ];
  it.each(cases)('%s', async (_name, element, marker) => {
    renderPage(element);
    expect(await screen.findByText(marker)).toBeInTheDocument();
  });
});
