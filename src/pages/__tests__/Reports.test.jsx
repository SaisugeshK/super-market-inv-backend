import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderPage, userEvent } from '../../test/render';
import { resetApiMock, onGet, errorReply, slowReply } from '../../test/apiMock';
import * as fx from '../../test/fixtures';
import Reports from '../Reports';

const seed = () => {
  onGet('/reports/sales', fx.salesReport);
  onGet('/reports/purchases', fx.purchaseReport);
  onGet('/reports/supplier-outstanding', fx.supplierOutstanding);
  onGet('/reports/stock', fx.stockReport);
  onGet('/reports/product-sales', fx.productSalesReport);
};

beforeEach(() => resetApiMock());

describe('Reports', () => {
  it('loads the Sales report by default', async () => {
    seed();
    renderPage(<Reports />);
    expect(await screen.findByText('INV-20260910-0001')).toBeInTheDocument();
    expect(screen.getByText(/Amul Milk 1L ×2/)).toBeInTheDocument();
  });

  it('switches tabs and shows each report without a console key warning', async () => {
    // The afterEach console guard fails the test if PurchasesTable (or any
    // table) renders rows with duplicate/undefined keys — this is the
    // regression test for the stale-rows-across-tabs bug.
    seed();
    const user = userEvent.setup();
    renderPage(<Reports />);
    await screen.findByText('INV-20260910-0001');

    await user.click(screen.getByRole('button', { name: /Purchases/ }));
    expect(await screen.findByText('PO-5567')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Supplier Outstanding/ }));
    expect(await screen.findByText('Metro Wholesale')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Stock/ }));
    expect(await screen.findByText('SALT0001')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Product Sales/ }));
    await waitFor(() => expect(screen.getByText('productName')).toBeInTheDocument());
  });

  it('clears the previous tab data immediately on switch (no foreign rows)', async () => {
    onGet('/reports/sales', fx.salesReport);
    onGet('/reports/purchases', slowReply(fx.purchaseReport, 40));
    const user = userEvent.setup();
    renderPage(<Reports />);
    await screen.findByText('INV-20260910-0001');
    await user.click(screen.getByRole('button', { name: /Purchases/ }));
    // sales invoice must be gone right away, before the purchases response lands
    expect(screen.queryByText('INV-20260910-0001')).not.toBeInTheDocument();
    expect(await screen.findByText('PO-5567')).toBeInTheDocument();
  });

  it('shows the empty state when a report returns no rows', async () => {
    seed();
    onGet('/reports/sales', []);
    renderPage(<Reports />);
    expect(await screen.findByText('No data')).toBeInTheDocument();
  });

  it('shows an error state when a report endpoint fails', async () => {
    seed();
    onGet('/reports/sales', errorReply(500));
    renderPage(<Reports />);
    expect(await screen.findByText('Could not load report')).toBeInTheDocument();
  });

  it('applies the date filter and refetches', async () => {
    seed();
    const user = userEvent.setup();
    const { container } = renderPage(<Reports />);
    await screen.findByText('INV-20260910-0001');
    const from = container.querySelector('input[type="datetime-local"]');
    await user.type(from, '2026-09-01T00:00');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('INV-20260910-0001')).toBeInTheDocument();
  });
});
