import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderPage, userEvent } from '../../test/render';
import { resetApiMock, onGet, errorReply } from '../../test/apiMock';
import * as fx from '../../test/fixtures';
import StockPage from '../StockPage';
import StockManagement from '../StockManagement';

const seed = () => {
  onGet('/reports/stock', fx.stockReport);
  onGet('/stock-movements', fx.stockMovements);
  onGet(/\/products$/, fx.products);
};

beforeEach(() => resetApiMock());

describe('Stock page', () => {
  it('renders the Levels tab with computed summary tiles', async () => {
    seed();
    renderPage(<StockPage />);
    expect(await screen.findByText('Amul Milk 1L')).toBeInTheDocument();
    // 2 SKUs, 1 low, value 1920 + 108
    expect(screen.getByText('Low Stock').closest('.erp-card')).toHaveTextContent('1');
    expect(screen.getByText('Products').closest('.erp-card')).toHaveTextContent('2');
  });

  it('shows the last stock movement per product', async () => {
    seed();
    renderPage(<StockPage />);
    const row = await screen.findByRole('row', { name: /Amul Milk 1L/ });
    expect(row).toHaveTextContent(/SALE_OUT 3/);
  });

  it('filters the stock table by search (StockManagement)', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<StockManagement />);
    await screen.findByText('Amul Milk 1L');
    await user.type(screen.getByPlaceholderText(/Search product or barcode/), 'salt');
    await waitFor(() => expect(screen.queryByText('Amul Milk 1L')).not.toBeInTheDocument());
    expect(screen.getByText('Tata Salt 1kg')).toBeInTheDocument();
  });

  it('refreshes on demand', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<StockManagement />);
    await screen.findByText('Amul Milk 1L');
    await user.click(screen.getByRole('button', { name: /Refresh/ }));
    expect(await screen.findByText('Amul Milk 1L')).toBeInTheDocument();
  });

  it('switches to the Movements tab (CRUD list)', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<StockPage />);
    await screen.findByText('Amul Milk 1L');
    await user.click(screen.getByRole('button', { name: /Movements/ }));
    expect(await screen.findByText('PURCHASE_IN')).toBeInTheDocument();
  });

  it('renders an error state if the stock report fails', async () => {
    onGet('/reports/stock', errorReply(500));
    onGet('/stock-movements', []);
    renderPage(<StockPage />);
    expect(await screen.findByText('Could not load stock')).toBeInTheDocument();
  });
});
