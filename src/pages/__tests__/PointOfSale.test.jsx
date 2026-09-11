import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPage, userEvent } from '../../test/render';
import { resetApiMock, onGet, onPost, errorReply } from '../../test/apiMock';
import * as fx from '../../test/fixtures';
import toast from 'react-hot-toast';
import PointOfSale from '../PointOfSale';

vi.mock('../../utils/invoicePdf', () => ({ downloadInvoicePdf: vi.fn() }));

const seedRefs = () => {
  onGet('/customers', fx.customers);
  onGet('/products', fx.products);
  onGet('/product-taxes', fx.productTaxes);
  onGet('/billing-counters', fx.counters);
  onGet('/hold-invoices', fx.heldInvoices);
  onGet('/products/search', fx.products.filter((p) => p.productName.includes('Milk')));
};

beforeEach(() => {
  resetApiMock();
  toast.error.mockClear();
});

describe('New Sale (PointOfSale)', () => {
  it('shows a loader, then the billing screen with mock data', async () => {
    seedRefs();
    renderPage(<PointOfSale />);
    expect(screen.getByRole('status')).toHaveTextContent(/Loading POS/i);
    expect(await screen.findByText('Billing / New Sale')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Priya Sharma/ })).toBeInTheDocument();
    expect(screen.getByText(/Cart is empty/)).toBeInTheDocument();
  });

  it('adds a searched product to the cart and computes live totals', async () => {
    seedRefs();
    const user = userEvent.setup();
    renderPage(<PointOfSale />);
    await screen.findByText('Billing / New Sale');

    await user.type(screen.getByPlaceholderText(/Search by name/), 'Milk');
    const result = await screen.findByRole('button', { name: /Amul Milk 1L/ });
    await user.click(result);

    // 1 x 62 + 5% GST => line total 65.10
    const cartRow = screen.getByRole('row', { name: /Amul Milk 1L/ });
    expect(within(cartRow).getByDisplayValue('1')).toBeInTheDocument();
    expect(within(cartRow).getByText('65.10')).toBeInTheDocument(); // line total
    expect(within(cartRow).getByText('62.00')).toBeInTheDocument(); // unit price
  });

  it('blocks checkout with an empty cart', async () => {
    seedRefs();
    renderPage(<PointOfSale />);
    await screen.findByText('Billing / New Sale');
    // Preview button is disabled on an empty cart — the guard is also in code.
    expect(screen.getByRole('button', { name: /Preview & Complete/ })).toBeDisabled();
  });

  it('requires a counter to be selected before completing the sale', async () => {
    seedRefs();
    const user = userEvent.setup();
    renderPage(<PointOfSale />);
    await screen.findByText('Billing / New Sale');
    await user.type(screen.getByPlaceholderText(/Search by name/), 'Milk');
    await user.click(await screen.findByRole('button', { name: /Amul Milk 1L/ }));

    await user.click(screen.getByRole('button', { name: /Preview & Complete/ }));
    expect(toast.error).toHaveBeenCalledWith('Please select a billing counter');
  });

  it('POSTs /sales/checkout with the correct payload (server computes money)', async () => {
    seedRefs();
    let sentPayload;
    onPost('/sales/checkout', ({ body }) => {
      sentPayload = body;
      return fx.checkoutResponse;
    });
    const user = userEvent.setup();
    renderPage(<PointOfSale />);
    await screen.findByText('Billing / New Sale');

    // comboboxes: [0] customer, [1] counter, [2] payment method
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], '2'); // customer Priya
    await user.selectOptions(selects[1], '1'); // Counter 1

    // add the same product twice -> quantity 2 (clearing the qty input to 0 would drop the line)
    const search = screen.getByPlaceholderText(/Search by name/);
    await user.type(search, 'Milk');
    await user.click(await screen.findByRole('button', { name: /Amul Milk 1L/ }));
    await user.type(search, 'Milk');
    await user.click(await screen.findByRole('button', { name: /Amul Milk 1L/ }));
    expect(within(screen.getByRole('row', { name: /Amul Milk 1L/ })).getByRole('spinbutton')).toHaveValue(2);

    // discount + paid (labels aren't associated in the summary card — grab by position)
    const summary = screen.getByText('Order Summary').closest('.erp-card');
    const summaryNums = within(summary).getAllByRole('spinbutton');
    await user.type(summaryNums[0], '10'); // Discount
    await user.type(summaryNums[1], '100'); // Paid Amount

    await user.click(screen.getByRole('button', { name: /Preview & Complete/ }));
    await user.click(await screen.findByRole('button', { name: /Confirm & Complete Sale/ }));

    await waitFor(() => expect(sentPayload).toBeDefined());
    expect(sentPayload).toEqual({
      customerId: 2,
      counterId: 1,
      createdBy: 1,
      paymentMethod: 'CASH',
      discountAmount: 10,
      paidAmount: 100,
      items: [{ productId: 1, quantity: 2 }],
    });
    expect(await screen.findByText('Sale Completed')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Sale completed successfully');
  });

  it('keeps the screen alive when checkout fails (interceptor handles the toast)', async () => {
    seedRefs();
    onPost('/sales/checkout', () => errorReply(400, 'Not enough stock'));
    const user = userEvent.setup();
    renderPage(<PointOfSale />);
    await screen.findByText('Billing / New Sale');
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[1], '1');
    await user.type(screen.getByPlaceholderText(/Search by name/), 'Milk');
    await user.click(await screen.findByRole('button', { name: /Amul Milk 1L/ }));
    await user.click(screen.getByRole('button', { name: /Preview & Complete/ }));
    await user.click(await screen.findByRole('button', { name: /Confirm & Complete Sale/ }));

    // no crash, modal still usable
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Confirm & Complete Sale/ })).toBeEnabled(),
    );
  });

  it('renders the held-bills modal', async () => {
    seedRefs();
    const user = userEvent.setup();
    renderPage(<PointOfSale />);
    await screen.findByText('Billing / New Sale');
    await user.click(screen.getByRole('button', { name: /Held Bills/ }));
    expect(await screen.findByText(/No held bills/)).toBeInTheDocument();
  });

  it('adds a product by scanning its barcode', async () => {
    seedRefs();
    onGet('/products/barcode/MILK0001', fx.products[0]);
    const user = userEvent.setup();
    renderPage(<PointOfSale />);
    await screen.findByText('Billing / New Sale');
    const scan = screen.getByPlaceholderText(/Scan or type barcode/);
    await user.type(scan, 'MILK0001{Enter}');
    expect(await screen.findByRole('row', { name: /Amul Milk 1L/ })).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Amul Milk 1L added');
  });

  it('removes a cart line', async () => {
    seedRefs();
    const user = userEvent.setup();
    renderPage(<PointOfSale />);
    await screen.findByText('Billing / New Sale');
    await user.type(screen.getByPlaceholderText(/Search by name/), 'Milk');
    await user.click(await screen.findByRole('button', { name: /Amul Milk 1L/ }));
    const row = screen.getByRole('row', { name: /Amul Milk 1L/ });
    await user.click(within(row).getByRole('button'));
    expect(screen.getByText(/Cart is empty/)).toBeInTheDocument();
  });

  it('holds a bill and clears the cart', async () => {
    seedRefs();
    onPost('/hold-invoices', () => ({ holdId: 1 }));
    const user = userEvent.setup();
    renderPage(<PointOfSale />);
    await screen.findByText('Billing / New Sale');
    await user.type(screen.getByPlaceholderText(/Search by name/), 'Milk');
    await user.click(await screen.findByRole('button', { name: /Amul Milk 1L/ }));
    await user.click(screen.getByRole('button', { name: /Hold Bill/ }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Bill held'));
    expect(screen.getByText(/Cart is empty/)).toBeInTheDocument();
  });

  it('adds a customer inline from the POS screen', async () => {
    seedRefs();
    let sent;
    onPost(/\/customers$/, ({ body }) => { sent = body; return { customerId: 55, ...body }; });
    const user = userEvent.setup();
    renderPage(<PointOfSale />);
    await screen.findByText('Billing / New Sale');
    await user.click(screen.getAllByRole('button').find((b) => b.textContent.trim() === 'New'));
    const dialog = await screen.findByRole('dialog');
    const fields = within(dialog).getAllByRole('textbox'); // [name, phone, email]
    await user.type(fields[0], 'New Buyer');
    await user.type(fields[1], '9001002003');
    await user.click(within(dialog).getByRole('button', { name: /Save & Select/ }));
    await waitFor(() => expect(sent).toMatchObject({ customerName: 'New Buyer', phone: '9001002003' }));
  });

  it('rejects an out-of-stock product', async () => {
    onGet('/customers', fx.customers);
    onGet('/products', [{ ...fx.products[0], stockQuantity: 0 }]);
    onGet('/product-taxes', fx.productTaxes);
    onGet('/billing-counters', fx.counters);
    onGet('/hold-invoices', []);
    onGet('/products/search', [{ ...fx.products[0], stockQuantity: 0 }]);
    const user = userEvent.setup();
    renderPage(<PointOfSale />);
    await screen.findByText('Billing / New Sale');
    await user.type(screen.getByPlaceholderText(/Search by name/), 'Milk');
    await user.click(await screen.findByRole('button', { name: /Amul Milk 1L/ }));
    expect(toast.error).toHaveBeenCalledWith('Amul Milk 1L is out of stock');
    expect(screen.getByText(/Cart is empty/)).toBeInTheDocument();
  });
});
