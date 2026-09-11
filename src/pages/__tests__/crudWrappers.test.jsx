import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderPage, userEvent } from '../../test/render';
import { resetApiMock, onGet, onPost } from '../../test/apiMock';
import * as fx from '../../test/fixtures';
import toast from 'react-hot-toast';

import Sales from '../Sales';
import StockMovements from '../StockMovements';
import BillingCounters from '../BillingCounters';

// Thin config-driven CrudPage wrappers: assert they wire the right columns,
// service and validation schema.

beforeEach(() => {
  resetApiMock();
  vi.clearAllMocks();
});

describe('Sales (CrudPage wrapper)', () => {
  it('lists sales with resolved customer + counter names', async () => {
    onGet(/\/sales$/, fx.sales);
    onGet(/\/customers$/, fx.customers);
    onGet(/\/billing-counters$/, fx.counters);
    onGet(/\/sales-items$/, []);
    onGet(/\/products$/, fx.products);
    renderPage(<Sales />);
    expect(await screen.findByText('INV-20260910-0001')).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /INV-20260910-0001/ });
    expect(within(row).getByText('Priya Sharma')).toBeInTheDocument();
    expect(within(row).getByText('Counter 1')).toBeInTheDocument();
  });

  it('has a per-row download-invoice action', async () => {
    onGet(/\/sales$/, fx.sales);
    onGet(/\/customers$/, fx.customers);
    onGet(/\/billing-counters$/, fx.counters);
    onGet(/\/sales-items$/, []);
    onGet(/\/products$/, fx.products);
    const user = userEvent.setup();
    renderPage(<Sales />);
    await screen.findByText('INV-20260910-0001');
    await user.click(screen.getAllByTitle('Download invoice')[0]);
    expect(toast.error).toHaveBeenCalledWith('No line items found for this sale');
  });
});

describe('StockMovements (CrudPage wrapper)', () => {
  it('lists movements and validates the manual-entry form', async () => {
    onGet(/\/products$/, fx.products);
    onGet(/\/stock-movements$/, fx.stockMovements);
    const user = userEvent.setup();
    renderPage(<StockMovements />);
    expect(await screen.findByText('PURCHASE_IN')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Add Stock Movement/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Product is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid quantity')).toBeInTheDocument();
  });

  it('submits a manual movement with a numeric quantity', async () => {
    onGet(/\/products$/, fx.products);
    onGet(/\/stock-movements$/, fx.stockMovements);
    let sent;
    onPost(/\/stock-movements$/, ({ body }) => { sent = body; return { movementId: 5, ...body }; });
    const user = userEvent.setup();
    renderPage(<StockMovements />);
    await screen.findByText('PURCHASE_IN');
    await user.click(screen.getByRole('button', { name: /Add Stock Movement/ }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getAllByRole('combobox')[0], '1');
    await user.type(within(dialog).getByLabelText(/Quantity/), '7');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('PURCHASE_IN')).toBeInTheDocument();
    expect(sent).toMatchObject({ productId: 1, movementType: 'IN', quantity: 7 });
    expect(typeof sent.quantity).toBe('number');
  });
});

describe('BillingCounters (CrudPage wrapper)', () => {
  it('lists counters and validates required fields (matches backend @NotBlank)', async () => {
    onGet('/billing-counters', fx.counters);
    const user = userEvent.setup();
    renderPage(<BillingCounters />);
    expect(await screen.findByText('Counter 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Add Billing Counter/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Counter name is required')).toBeInTheDocument();
    expect(screen.getByText('Location is required')).toBeInTheDocument();
  });

  it('creates a counter with a valid payload', async () => {
    onGet('/billing-counters', fx.counters);
    let sent;
    onPost('/billing-counters', ({ body }) => { sent = body; return { counterId: 3, ...body }; });
    const user = userEvent.setup();
    renderPage(<BillingCounters />);
    await screen.findByText('Counter 1');
    await user.click(screen.getByRole('button', { name: /Add Billing Counter/ }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Counter Name/), 'Counter 3');
    await user.type(within(dialog).getByLabelText(/Location/), 'Express');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(sent).toMatchObject({ counterName: 'Counter 3', location: 'Express', status: 'ACTIVE' });
  });
});
