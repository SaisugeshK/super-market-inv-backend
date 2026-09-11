import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPage, userEvent } from '../../test/render';
import { resetApiMock, onGet, onPost } from '../../test/apiMock';
import * as fx from '../../test/fixtures';
import toast from 'react-hot-toast';
import Payments from '../Payments';
import PurchaseReturns from '../PurchaseReturns';

// These two screens are not linked in the nav (Payments route is nav-disabled,
// /purchase-returns redirects to /purchases) but are still bundled, so they get
// interaction coverage here.

beforeEach(() => {
  resetApiMock();
  vi.clearAllMocks();
});

describe('Payments', () => {
  const pendingSale = { saleId: 5, id: 5, invoiceNumber: 'INV-PEND-1', totalAmount: 500, paymentStatus: 'PENDING', customerId: 2, counterId: 1, paymentMethod: 'CASH' };

  const seed = () => {
    onGet(/\/payments$/, []);
    onGet(/\/sales$/, [pendingSale, ...fx.sales]);
    onGet(/\/sales-items$/, [{ saleItemId: 1, saleId: 5, productId: 1, quantity: 2, sellingPrice: 250, total: 500 }]);
    onGet(/\/products$/, fx.products);
  };

  it('shows the empty payments table then opens the add-payment modal', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<Payments />);
    expect(await screen.findByText('No payments yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Add payment/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('rejects saving without a matched sale', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<Payments />);
    await screen.findByText('No payments yet');
    await user.click(screen.getByRole('button', { name: /Add payment/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Save payment' }));
    expect(toast.error).toHaveBeenCalledWith('Pick a pending sale by its invoice number');
  });

  it('records a payment against a matched sale', async () => {
    seed();
    let sent;
    onPost(/\/payments$/, ({ body }) => { sent = body; return { transactionId: 1, ...body }; });
    const user = userEvent.setup();
    renderPage(<Payments />);
    await screen.findByText('No payments yet');
    await user.click(screen.getByRole('button', { name: /Add payment/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText(/Type or pick a pending sale/), 'INV-PEND-1');
    await waitFor(() => expect(within(dialog).getByText(/Balance due/)).toBeInTheDocument());
    await user.click(within(dialog).getByRole('button', { name: 'Save payment' }));
    await waitFor(() => expect(sent).toMatchObject({ invoiceId: 5, amount: 500, paymentMethod: 'CASH' }));
  });
});

describe('PurchaseReturns', () => {
  const seed = () => {
    onGet(/\/purchase-returns$/, [
      { purchaseReturnId: 1, id: 1, purchaseId: 1, supplierId: 1, totalAmount: 240, notes: 'damaged', status: 'COMPLETED' },
    ]);
    onGet(/\/purchase-return-items$/, []);
    onGet(/\/purchases$/, fx.purchases);
    onGet(/\/suppliers$/, fx.suppliers);
    onGet(/\/products$/, fx.products);
  };

  it('renders the returns list', async () => {
    seed();
    renderPage(<PurchaseReturns />);
    expect(await screen.findByText(/Purchase Returns/)).toBeInTheDocument();
    expect(await screen.findByText(/damaged/)).toBeInTheDocument();
  });

  it('opens the form and validates required inputs', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<PurchaseReturns />);
    await screen.findByText(/Purchase Returns/);
    await user.click(screen.getByRole('button', { name: /Add Purchase Return/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /Save/ }));
    expect(toast.error).toHaveBeenCalledWith('Please select a purchase');
  });

  it('selects a purchase, sets a return qty and a reason, then saves', async () => {
    onGet(/\/purchase-returns$/, []);
    onGet(/\/purchase-return-items$/, []);
    onGet(/\/purchases$/, [{ ...fx.purchases[0], id: 1 }]);
    onGet(/\/purchase-items$/, [
      { purchaseItemId: 1, purchaseId: 1, productId: 1, productName: 'Amul Milk 1L', quantity: 50, purchasePrice: 48 },
    ]);
    onGet(/\/suppliers$/, fx.suppliers.map((s) => ({ ...s, id: s.supplierId })));
    let sent;
    onPost(/\/purchase-returns$/, ({ body }) => { sent = body; return { purchaseReturnId: 7, ...body }; });
    onPost(/\/purchase-return-items$/, () => ({ id: 1 }));
    const user = userEvent.setup();
    renderPage(<PurchaseReturns />);
    await screen.findByText(/Purchase Returns/);
    await user.click(screen.getByRole('button', { name: /Add Purchase Return/ }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByRole('combobox'), '1');
    const reason = within(dialog).getAllByRole('textbox').at(-1);
    await user.type(reason, 'Expired stock');
    const qtyInputs = within(dialog).getAllByRole('spinbutton');
    await user.clear(qtyInputs.at(-1));
    await user.type(qtyInputs.at(-1), '5');
    await user.click(within(dialog).getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(sent).toMatchObject({ purchaseId: 1, notes: 'Expired stock' }));
  });
});
