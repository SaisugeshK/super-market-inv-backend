import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderPage } from '../../test/render';
import { resetApiMock, onGet, errorReply } from '../../test/apiMock';
import * as fx from '../../test/fixtures';
import Dashboard from '../Dashboard';

const seed = () => {
  onGet(/\/products$/, fx.products);
  onGet(/\/customers$/, fx.customers);
  onGet(/\/suppliers$/, fx.suppliers);
  onGet(/\/invoices$/, []);
  onGet(/\/purchases$/, fx.purchases);
  onGet(/\/sales$/, fx.sales);
  onGet('/dashboard/summary', fx.dashboardSummary);
};

beforeEach(() => resetApiMock());

describe('Dashboard', () => {
  it('shows a loader then the stat cards with counts from mock data', async () => {
    seed();
    renderPage(<Dashboard />);
    expect(screen.getByRole('status')).toHaveTextContent(/Loading dashboard/i);

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    const card = (label) => screen.getByText(label).closest('.col-sm-6, .col-lg-3, .col-lg-4');
    expect(card('Products')).toHaveTextContent('3');
    expect(card('Customers')).toHaveTextContent('2');
    expect(card('Suppliers')).toHaveTextContent('2');
    expect(card('Invoices')).toHaveTextContent('2'); // sales.length
  });

  it('renders today/outstanding KPIs from /dashboard/summary', async () => {
    seed();
    renderPage(<Dashboard />);
    expect(await screen.findByText("Today's Sales")).toBeInTheDocument();
    expect(screen.getByText("Today's Bills").closest('div').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Supplier Pending').closest('div').parentElement).toHaveTextContent('3,040');
  });

  it('lists low-stock products from the summary', async () => {
    seed();
    renderPage(<Dashboard />);
    expect(await screen.findByText('Low Stock Products')).toBeInTheDocument();
    expect(screen.getByText('Tata Salt 1kg')).toBeInTheDocument();
  });

  it('shows the error page if the core data fails to load', async () => {
    onGet(/\/products$/, errorReply(500));
    onGet(/\/customers$/, errorReply(500));
    onGet(/\/suppliers$/, errorReply(500));
    onGet(/\/invoices$/, errorReply(500));
    renderPage(<Dashboard />);
    expect(await screen.findByText(/Could not load dashboard data/i)).toBeInTheDocument();
  });
});
