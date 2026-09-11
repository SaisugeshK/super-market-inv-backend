import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPage, userEvent } from '../../test/render';
import { resetApiMock, onGet, onPost, errorReply } from '../../test/apiMock';
import * as fx from '../../test/fixtures';
import toast from 'react-hot-toast';
import CashClosing from '../CashClosing';

const seed = () => {
  onGet('/cash-closing/counter/1/summary', fx.cashClosingSummary);
  onGet('/billing-counters', fx.counters);
  onGet(/\/cash-closing$/, fx.cashClosings);
};

beforeEach(() => {
  resetApiMock();
  toast.error.mockClear();
});

describe('Cash Closing', () => {
  it('lists existing cash closings from mock data', async () => {
    seed();
    renderPage(<CashClosing />);
    expect(await screen.findByText('Cash Closing')).toBeInTheDocument();
    expect(await screen.findByText('Counter 1')).toBeInTheDocument();
    expect(screen.getByText('CLOSED')).toBeInTheDocument();
  });

  it('opens the modal and shows the backend summary once a counter is picked', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<CashClosing />);
    await screen.findByText('Cash Closing');
    await user.click(screen.getByRole('button', { name: /Add Cash Closing/ }));

    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText(/Counter/), '1');

    expect(await within(dialog).findByText('CASH')).toBeInTheDocument();
    expect(within(dialog).getByText('Digital Payments')).toBeInTheDocument();
    // expected closing cash = 0 opening + 187 sales; total sales ₹249.00
    expect(within(dialog).getAllByText('₹187.00').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('₹249.00')).toBeInTheDocument();
  });

  it('requires the actual closing cash before submitting', async () => {
    seed();
    const user = userEvent.setup();
    renderPage(<CashClosing />);
    await screen.findByText('Cash Closing');
    await user.click(screen.getByRole('button', { name: /Add Cash Closing/ }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText(/Counter/), '1');
    await within(dialog).findByText('CASH');

    await user.click(within(dialog).getByRole('button', { name: 'Save Cash Closing' }));
    expect(await within(dialog).findByText('Actual closing cash is required')).toBeInTheDocument();
  });

  it('POSTs /cash-closing with counterId + per-method actual amounts', async () => {
    seed();
    let sent;
    onPost(/\/cash-closing$/, ({ body }) => {
      sent = body;
      return { id: 2, status: 'CLOSED' };
    });
    const user = userEvent.setup();
    renderPage(<CashClosing />);
    await screen.findByText('Cash Closing');
    await user.click(screen.getByRole('button', { name: /Add Cash Closing/ }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText(/Counter/), '1');
    await within(dialog).findByText('CASH');

    await user.type(within(dialog).getByLabelText(/Actual Closing Cash/), '190');
    await user.type(within(dialog).getByLabelText(/Verified Amount/), '62');

    await user.click(within(dialog).getByRole('button', { name: 'Save Cash Closing' }));

    await waitFor(() => expect(sent).toBeDefined());
    expect(sent.counterId).toBe(1);
    expect(sent.paymentClosings).toEqual(
      expect.arrayContaining([
        { paymentMethod: 'CASH', actualAmount: 190 },
        { paymentMethod: 'UPI', actualAmount: 62 },
      ]),
    );
  });

  it('shows an error alert when the summary fetch fails', async () => {
    onGet('/billing-counters', fx.counters);
    onGet(/\/cash-closing$/, []);
    onGet('/cash-closing/counter/1/summary', errorReply(500));
    const user = userEvent.setup();
    renderPage(<CashClosing />);
    await screen.findByText('Cash Closing');
    await user.click(screen.getByRole('button', { name: /Add Cash Closing/ }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText(/Counter/), '1');
    expect(await within(dialog).findByText(/Failed to load summary/)).toBeInTheDocument();
  });
});
