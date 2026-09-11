import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPage, userEvent } from '../../test/render';
import { resetApiMock, onGet, onPost, errorReply } from '../../test/apiMock';
import * as fx from '../../test/fixtures';
import toast from 'react-hot-toast';
import Purchases from '../Purchases';

const seed = () => {
  onGet('/suppliers', fx.suppliers);
  onGet('/products', fx.products);
  onGet('/purchase-items', []);
  onGet('/purchases', fx.purchases);
};

beforeEach(() => {
  resetApiMock();
  toast.error.mockClear();
  toast.success.mockClear();
});

describe('Purchases', () => {
  it('shows a loader then the purchases list', async () => {
    seed();
    renderPage(<Purchases />);
    expect(screen.getByRole('status')).toHaveTextContent(/Loading purchase data/i);
    expect(await screen.findByText('Purchases')).toBeInTheDocument();
    expect(await screen.findByText('PO-5567')).toBeInTheDocument();
    expect(screen.getByText('Metro Wholesale')).toBeInTheDocument();
  });

  it('validates the purchase form before calling the API', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<Purchases />);
    await screen.findByText('Purchases');
    await user.click(screen.getByRole('button', { name: /New purchase/ }));
    await user.click(screen.getByRole('button', { name: 'Save Purchase' }));
    expect(toast.error).toHaveBeenCalledWith('Please select a supplier');
  });

  it('requires an invoice number and at least one product line', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<Purchases />);
    await screen.findByText('Purchases');
    await user.click(screen.getByRole('button', { name: /New purchase/ }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getAllByRole('combobox')[0], '1'); // supplier
    await user.click(within(dialog).getByRole('button', { name: 'Save Purchase' }));
    expect(toast.error).toHaveBeenCalledWith('Please enter the supplier invoice/reference number');
  });

  it('POSTs /purchases/receive with the atomic goods-receipt payload', async () => {
    seed();
    let sent;
    onPost('/purchases/receive', ({ body }) => {
      sent = body;
      return fx.purchaseReceiveResponse;
    });
    const user = userEvent.setup();
    renderPage(<Purchases />);
    await screen.findByText('Purchases');

    await user.click(screen.getByRole('button', { name: /New purchase/ }));
    const dialog = screen.getByRole('dialog');
    const selects = within(dialog).getAllByRole('combobox');
    await user.selectOptions(selects[0], '1'); // supplier Metro
    // invoice ref field: the only free-text input in the modal
    const textInputs = within(dialog).getAllByRole('textbox');
    await user.clear(textInputs[0]);
    await user.type(textInputs[0], 'PO-TEST');

    // line 1 product + qty + price
    await user.selectOptions(selects[1], '1'); // product Amul Milk (line product select)
    const spin = within(dialog).getAllByRole('spinbutton');
    // [0] Amount Paid, [1] qty, [2] purchase price, [3] tax amount
    await user.clear(spin[0]);
    await user.type(spin[0], '100');
    await user.clear(spin[1]);
    await user.type(spin[1], '10');
    await user.clear(spin[2]);
    await user.type(spin[2], '40');
    await user.clear(spin[3]);
    await user.type(spin[3], '20');

    await user.click(within(dialog).getByRole('button', { name: 'Save Purchase' }));

    await waitFor(() => expect(sent).toBeDefined());
    expect(sent).toEqual({
      supplierId: 1,
      invoiceNumber: 'PO-TEST',
      paidAmount: 100,
      createdBy: 1,
      items: [{ productId: 1, quantity: 10, purchasePrice: 40, taxAmount: 20 }],
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Purchase recorded successfully'));
  });

  it('stays usable when the receive call fails', async () => {
    seed();
    onPost('/purchases/receive', () => errorReply(400, 'Not enough stock'));
    const user = userEvent.setup();
    renderPage(<Purchases />);
    await screen.findByText('Purchases');
    await user.click(screen.getByRole('button', { name: /New purchase/ }));
    const dialog = screen.getByRole('dialog');
    const selects = within(dialog).getAllByRole('combobox');
    await user.selectOptions(selects[0], '1');
    const textInputs = within(dialog).getAllByRole('textbox');
    await user.type(textInputs[0], 'PO-X');
    await user.selectOptions(selects[1], '1');
    const spin = within(dialog).getAllByRole('spinbutton');
    await user.clear(spin[1]);
    await user.type(spin[1], '5');
    await user.click(within(dialog).getByRole('button', { name: 'Save Purchase' }));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Save Purchase' })).toBeEnabled());
  });

  it('opens the delete confirmation from a row', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<Purchases />);
    await screen.findByText('PO-5567');
    await user.click(screen.getByTitle('Delete'));
    expect(await screen.findByText('Delete purchase?')).toBeInTheDocument();
  });

  it('adds and removes purchase line rows', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<Purchases />);
    await screen.findByText('Purchases');
    await user.click(screen.getByRole('button', { name: /New purchase/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByRole('row')).toHaveLength(2); // header + 1 line
    await user.click(within(dialog).getByRole('button', { name: /Add Line/ }));
    expect(within(dialog).getAllByRole('row')).toHaveLength(3);
    // remove the 2nd line
    const removeButtons = within(dialog).getAllByRole('button').filter((b) => b.querySelector('svg') && b.className.includes('btn-outline-danger'));
    await user.click(removeButtons[1]);
    expect(within(dialog).getAllByRole('row')).toHaveLength(2);
  });

  it('adds a supplier inline from the purchase form', async () => {
    seed();
    let sent;
    onPost(/\/suppliers$/, ({ body }) => { sent = body; return { supplierId: 9, ...body }; });
    const user = userEvent.setup();
    renderPage(<Purchases />);
    await screen.findByText('Purchases');
    await user.click(screen.getByRole('button', { name: /New purchase/ }));
    await user.click(screen.getAllByRole('button').find((b) => b.textContent.trim() === 'New'));
    const addDialog = await screen.findByText('Add Supplier');
    const modal = addDialog.closest('.modal-content');
    const fields = within(modal).getAllByRole('textbox'); // [supplierName, phone, gstNumber]
    await user.type(fields[0], 'Quick Vendor');
    await user.type(fields[1], '9000000001');
    await user.click(within(modal).getByRole('button', { name: /Save & Select/ }));
    await waitFor(() => expect(sent).toMatchObject({ supplierName: 'Quick Vendor', phone: '9000000001' }));
  });

  it('opens the return-goods modal for a purchase row', async () => {
    seed();
    onGet('/purchase-items', [
      { purchaseItemId: 1, purchaseId: 1, productId: 1, productName: 'Amul Milk 1L', quantity: 100, purchasePrice: 48 },
    ]);
    const user = userEvent.setup();
    renderPage(<Purchases />);
    await screen.findByText('PO-5567');
    await user.click(screen.getByRole('button', { name: /Return/ }));
    expect(await screen.findByText(/Return goods — PO-5567/)).toBeInTheDocument();
    expect(screen.getByText(/Products to return/)).toBeInTheDocument();
  });
});
