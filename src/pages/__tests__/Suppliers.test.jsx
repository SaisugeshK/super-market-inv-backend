import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPage, userEvent } from '../../test/render';
import { resetApiMock, onGet, onPost, errorReply } from '../../test/apiMock';
import * as fx from '../../test/fixtures';
import toast from 'react-hot-toast';
import Suppliers from '../Suppliers';

const seed = () => {
  onGet('/suppliers', fx.suppliers);
  onGet('/reports/supplier-outstanding', fx.supplierOutstanding);
  onGet('/reports/purchases', fx.purchaseReport);
};

beforeEach(() => {
  resetApiMock();
  toast.error.mockClear();
});

describe('Suppliers', () => {
  it('lists suppliers with their outstanding balance', async () => {
    seed();
    renderPage(<Suppliers />);
    expect(await screen.findByText('Metro Wholesale')).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /Metro Wholesale/ });
    expect(within(row).getByText('₹3,040')).toBeInTheDocument();
    expect(within(row).getByText('Pending')).toBeInTheDocument();
  });

  it('validates required name and phone client-side', async () => {
    seed();
    const create = vi.fn();
    onPost(/\/suppliers$/, create);
    const user = userEvent.setup();
    renderPage(<Suppliers />);
    await screen.findByText('Metro Wholesale');
    await user.click(screen.getByRole('button', { name: /Add supplier/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Supplier name is required')).toBeInTheDocument();
    expect(screen.getByText(/phone is required|valid phone number/i)).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a malformed phone number', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<Suppliers />);
    await screen.findByText('Metro Wholesale');
    await user.click(screen.getByRole('button', { name: /Add supplier/ }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Supplier name/), 'New Vendor');
    await user.type(within(dialog).getByLabelText(/Phone/), 'abc');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a valid phone number')).toBeInTheDocument();
  });

  it('creates a supplier with a valid payload', async () => {
    seed();
    let sent;
    onPost(/\/suppliers$/, ({ body }) => { sent = body; return { supplierId: 3, ...body }; });
    const user = userEvent.setup();
    renderPage(<Suppliers />);
    await screen.findByText('Metro Wholesale');
    await user.click(screen.getByRole('button', { name: /Add supplier/ }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Supplier name/), 'New Vendor');
    await user.type(within(dialog).getByLabelText(/Phone/), '9123456780');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(sent).toMatchObject({ supplierName: 'New Vendor', phone: '9123456780', status: 'ACTIVE' }));
  });

  it('opens the supplier detail drawer and loads purchase history', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<Suppliers />);
    await screen.findByText('Metro Wholesale');
    await user.click(screen.getByRole('button', { name: 'Metro Wholesale' }));
    expect(await screen.findByText(/Metro Wholesale — overview/)).toBeInTheDocument();
    expect(await screen.findByText(/Amul Milk 1L/)).toBeInTheDocument();
  });

  it('still renders the list if the outstanding report errors out', async () => {
    onGet('/suppliers', fx.suppliers);
    onGet('/reports/supplier-outstanding', errorReply(500));
    renderPage(<Suppliers />);
    expect(await screen.findByText('Metro Wholesale')).toBeInTheDocument();
  });
});
