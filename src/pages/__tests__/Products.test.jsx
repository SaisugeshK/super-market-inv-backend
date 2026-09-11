import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPage, userEvent } from '../../test/render';
import { resetApiMock, onGet, onPost, errorReply } from '../../test/apiMock';
import * as fx from '../../test/fixtures';
import toast from 'react-hot-toast';
import Products from '../Products';

const seed = () => {
  onGet('/products', fx.products);
  onGet('/categories', fx.categories);
  onGet('/units', fx.units);
  onGet('/product-taxes', fx.productTaxes);
};

// Fills every required field in the Add Product modal with valid values.
async function fillValidProduct(user, dialog, over = {}) {
  const v = { name: 'Maggi Noodles', sku: 'MAGGI-70', barcode: 'MAGGI070', pp: '11', sp: '14', sq: '50', ms: '10', ...over };
  const selects = within(dialog).getAllByRole('combobox'); // [0] category [1] unit [2] status
  await user.selectOptions(selects[0], '5');
  await user.type(within(dialog).getByLabelText(/Product Name/), v.name);
  await user.type(within(dialog).getByLabelText(/SKU/), v.sku);
  await user.type(within(dialog).getByLabelText(/Barcode \(primary\)/), v.barcode);
  await user.type(within(dialog).getByLabelText(/Purchase Price/), v.pp);
  await user.type(within(dialog).getByLabelText(/Selling Price/), v.sp);
  await user.type(within(dialog).getByLabelText(/Stock Quantity/), v.sq);
  await user.type(within(dialog).getByLabelText(/Minimum Stock/), v.ms);
}

beforeEach(() => {
  resetApiMock();
  toast.error.mockClear();
});

describe('Products', () => {
  it('renders the catalog once references load', async () => {
    seed();
    renderPage(<Products />);
    expect(screen.getByRole('status')).toHaveTextContent(/Loading catalog/i);
    expect(await screen.findByText('Amul Milk 1L')).toBeInTheDocument();
    const saltRow = screen.getByRole('row', { name: /Tata Salt 1kg/ });
    expect(within(saltRow).getByText('6')).toHaveClass('bg-danger'); // low stock
  });

  it('searches by name', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<Products />);
    await screen.findByText('Amul Milk 1L');
    await user.type(screen.getByPlaceholderText(/Search products/), 'salt');
    await waitFor(() => expect(screen.queryByText('Amul Milk 1L')).not.toBeInTheDocument());
    expect(screen.getByText('Tata Salt 1kg')).toBeInTheDocument();
  });

  it('blocks submit and flags every required field client-side', async () => {
    seed();
    const create = vi.fn();
    onPost(/\/products$/, create);
    const user = userEvent.setup();
    renderPage(<Products />);
    await screen.findByText('Amul Milk 1L');
    await user.click(screen.getByRole('button', { name: /Add product/ }));
    await user.click(screen.getByRole('button', { name: 'Save Product' }));

    expect(await screen.findByText('Product name is required')).toBeInTheDocument();
    expect(screen.getByText('SKU is required')).toBeInTheDocument();
    expect(screen.getByText('Category is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid barcode')).toBeInTheDocument();
    expect(screen.getAllByText('Enter a valid amount').length).toBe(2); // purchase + selling price
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a non-positive price and a malformed barcode', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<Products />);
    await screen.findByText('Amul Milk 1L');
    await user.click(screen.getByRole('button', { name: /Add product/ }));
    const dialog = screen.getByRole('dialog');
    await fillValidProduct(user, dialog, { barcode: 'no', sp: '-3' });
    await user.click(within(dialog).getByRole('button', { name: 'Save Product' }));
    expect(await screen.findByText('Enter a valid barcode')).toBeInTheDocument();
    expect(screen.getByText('Must be positive')).toBeInTheDocument();
  });

  it('submits a valid product with a fully numeric payload', async () => {
    seed();
    let sent;
    onPost(/\/products$/, ({ body }) => { sent = body; return { productId: 9, ...body }; });
    const user = userEvent.setup();
    renderPage(<Products />);
    await screen.findByText('Amul Milk 1L');
    await user.click(screen.getByRole('button', { name: /Add product/ }));
    const dialog = screen.getByRole('dialog');
    await fillValidProduct(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Save Product' }));

    await waitFor(() => expect(sent).toBeDefined());
    expect(sent).toMatchObject({
      categoryId: 5, productName: 'Maggi Noodles', sku: 'MAGGI-70', barcode: 'MAGGI070',
      purchasePrice: 11, sellingPrice: 14, stockQuantity: 50, minimumStock: 10,
    });
    expect(typeof sent.purchasePrice).toBe('number');
  });

  it('keeps the modal open when the backend returns a 409 duplicate', async () => {
    seed();
    onPost(/\/products$/, () => errorReply(409, 'Barcode already exists'));
    const user = userEvent.setup();
    renderPage(<Products />);
    await screen.findByText('Amul Milk 1L');
    await user.click(screen.getByRole('button', { name: /Add product/ }));
    const dialog = screen.getByRole('dialog');
    await fillValidProduct(user, dialog, { barcode: 'MILK0001' });
    await user.click(within(dialog).getByRole('button', { name: 'Save Product' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });

  it('stays on the loader (no crash) if the catalog fails to load', async () => {
    onGet('/categories', errorReply(500));
    onGet('/products', errorReply(500));
    renderPage(<Products />);
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });
});

describe('Products — bulk import', () => {
  const makeFile = (name, content = 'a,b\n1,2', type = 'text/csv') =>
    new File([content], name, { type });

  beforeEach(() => {
    // jsdom has no object-URL / real navigation support; the "download
    // template" link only needs to fire the request in these tests.
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('opens the import modal next to Add product without touching it', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<Products />);
    await screen.findByText('Amul Milk 1L');

    expect(screen.getByRole('button', { name: /Add product/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Import CSV\/Excel/ }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Import Products');
  });

  it('downloads the template from the modal', async () => {
    seed();
    const templateCall = vi.fn(() => 'Category,Product Name,SKU');
    onGet('/products/import/template', templateCall);
    const user = userEvent.setup();
    renderPage(<Products />);
    await screen.findByText('Amul Milk 1L');
    await user.click(screen.getByRole('button', { name: /Import CSV\/Excel/ }));
    await user.click(await screen.findByRole('button', { name: /Download template/ }));
    await waitFor(() => expect(templateCall).toHaveBeenCalled());
  });

  it('imports a valid file, shows the success summary, and refreshes the product list', async () => {
    seed();
    let productsLoadCount = 0;
    onGet('/products', () => {
      productsLoadCount += 1;
      return fx.products;
    });
    onPost('/products/import', () => ({
      totalRows: 2,
      succeeded: 2,
      failed: 0,
      rows: [
        { rowNumber: 2, productName: 'New Item A', status: 'created', message: 'Created', productId: 101 },
        { rowNumber: 3, productName: 'New Item B', status: 'created', message: 'Created', productId: 102 },
      ],
    }));
    const user = userEvent.setup();
    renderPage(<Products />);
    await screen.findByText('Amul Milk 1L');
    const loadsBefore = productsLoadCount;

    await user.click(screen.getByRole('button', { name: /Import CSV\/Excel/ }));
    const dialog = await screen.findByRole('dialog');
    const input = dialog.querySelector('input[type="file"]');
    await user.upload(input, makeFile('products.csv'));
    await user.click(within(dialog).getByRole('button', { name: 'Import' }));

    expect(await within(dialog).findByText(/2 of 2 products imported successfully/)).toBeInTheDocument();
    await waitFor(() => expect(productsLoadCount).toBeGreaterThan(loadsBefore));
  });

  it('reports a partial import with specific per-row failure reasons', async () => {
    seed();
    onPost('/products/import', () => ({
      totalRows: 3,
      succeeded: 1,
      failed: 2,
      rows: [
        { rowNumber: 2, productName: 'Good Item', status: 'created', message: 'Created', productId: 201 },
        { rowNumber: 3, productName: null, status: 'failed', message: 'productName is required' },
        { rowNumber: 4, productName: 'Bad Price Item', status: 'failed', message: 'sellingPrice cannot be negative' },
      ],
    }));
    const user = userEvent.setup();
    renderPage(<Products />);
    await screen.findByText('Amul Milk 1L');
    await user.click(screen.getByRole('button', { name: /Import CSV\/Excel/ }));
    const dialog = await screen.findByRole('dialog');
    await user.upload(dialog.querySelector('input[type="file"]'), makeFile('products.csv'));
    await user.click(within(dialog).getByRole('button', { name: 'Import' }));

    expect(await within(dialog).findByText(/1 of 3 products imported successfully/)).toBeInTheDocument();
    expect(within(dialog).getByText(/2 row\(s\) failed/)).toBeInTheDocument();

    // The plain-language "why these failed" summary is visible without any extra click.
    expect(within(dialog).getByText(/A required field was left blank/)).toBeInTheDocument();
    expect(within(dialog).getByText(/A price or quantity was negative/)).toBeInTheDocument();

    // The exact backend message per row is available on request, one click away.
    await user.click(within(dialog).getByRole('button', { name: /row-by-row details/ }));
    expect(within(dialog).getByText('productName is required')).toBeInTheDocument();
    expect(within(dialog).getByText('sellingPrice cannot be negative')).toBeInTheDocument();
  });

  it('summarizes a bulk "all rows failed for the same reason" case in plain language', async () => {
    seed();
    onPost('/products/import', () => ({
      totalRows: 3,
      succeeded: 0,
      failed: 3,
      rows: [
        { rowNumber: 2, productName: 'Rice (Sona Masoori) 5kg Bag', status: 'failed', message: 'SKU already exists: RICE-SM-5KG' },
        { rowNumber: 3, productName: 'Rice (Idli Rice) 5kg Bag', status: 'failed', message: 'SKU already exists: RICE-IDLI-5KG' },
        { rowNumber: 4, productName: 'Wheat Flour (Atta) 5kg', status: 'failed', message: 'SKU already exists: WHEAT-ATTA-5KG' },
      ],
    }));
    const user = userEvent.setup();
    renderPage(<Products />);
    await screen.findByText('Amul Milk 1L');
    await user.click(screen.getByRole('button', { name: /Import CSV\/Excel/ }));
    const dialog = await screen.findByRole('dialog');
    await user.upload(dialog.querySelector('input[type="file"]'), makeFile('products.csv'));
    await user.click(within(dialog).getByRole('button', { name: 'Import' }));

    expect(await within(dialog).findByText(/0 of 3 products imported successfully/)).toBeInTheDocument();
    // The pattern is visible up front — no need to open each of the 3 rows to notice they all say the same thing.
    expect(within(dialog).getByText(/3 rows/)).toBeInTheDocument();
    expect(within(dialog).getByText(/SKU already exists in your catalog/)).toBeInTheDocument();
    expect(within(dialog).getByText(/nothing to fix/)).toBeInTheDocument();
    // Row-by-row detail stays available, just collapsed by default.
    expect(within(dialog).queryByText('SKU already exists: RICE-SM-5KG')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /row-by-row details/ }));
    expect(within(dialog).getByText('SKU already exists: RICE-SM-5KG')).toBeInTheDocument();
  });

  it('surfaces a 403 from a non-admin user without crashing the modal', async () => {
    seed();
    onPost('/products/import', () => errorReply(403, 'You do not have permission to perform this action'));
    const user = userEvent.setup();
    renderPage(<Products />);
    await screen.findByText('Amul Milk 1L');
    await user.click(screen.getByRole('button', { name: /Import CSV\/Excel/ }));
    const dialog = await screen.findByRole('dialog');
    await user.upload(dialog.querySelector('input[type="file"]'), makeFile('products.csv'));
    await user.click(within(dialog).getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(within(dialog).queryByText(/products imported successfully/)).not.toBeInTheDocument();
  });

  it('rejects a wrong file type cleanly (backend 400) without crashing', async () => {
    seed();
    onPost('/products/import', () => errorReply(400, 'Invalid file type: only .csv and .xlsx files are supported'));
    const user = userEvent.setup();
    renderPage(<Products />);
    await screen.findByText('Amul Milk 1L');
    await user.click(screen.getByRole('button', { name: /Import CSV\/Excel/ }));
    const dialog = await screen.findByRole('dialog');
    await user.upload(
      dialog.querySelector('input[type="file"]'),
      makeFile('products.pdf', '%PDF-1.4', 'application/pdf'),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(within(dialog).queryByText(/products imported successfully/)).not.toBeInTheDocument();
  });
});
