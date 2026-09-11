import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentMethodClosingRow from '../cashClosing/PaymentMethodClosingRow';
import DifferenceBadge from '../cashClosing/DifferenceBadge';
import CashClosingActions from '../cashClosing/CashClosingActions';
import CashClosingSection from '../cashClosing/CashClosingSection';
import DigitalPaymentSection from '../cashClosing/DigitalPaymentSection';
import CashClosingSummary from '../cashClosing/CashClosingSummary';

describe('PaymentMethodClosingRow', () => {
  it('formats the amount and shows a minus for subtracted values', () => {
    render(<PaymentMethodClosingRow label="Refunds" value={40} subtract />);
    expect(screen.getByText('-₹40.00')).toBeInTheDocument();
  });
});

describe('DifferenceBadge', () => {
  it('MATCH when the difference is ~0', () => {
    render(<DifferenceBadge difference={0} />);
    expect(screen.getByText('MATCH')).toBeInTheDocument();
  });
  it('SHORTAGE when negative', () => {
    render(<DifferenceBadge difference={-15} />);
    expect(screen.getByText('SHORTAGE')).toBeInTheDocument();
    expect(screen.getByText('-₹15.00')).toBeInTheDocument();
  });
  it('EXCESS when positive', () => {
    render(<DifferenceBadge difference={22} />);
    expect(screen.getByText('EXCESS')).toBeInTheDocument();
  });
});

describe('CashClosingActions', () => {
  it('wires save / cancel and disables save until canSave', async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(<CashClosingActions onSave={onSave} onCancel={onCancel} canSave={false} />);
    expect(screen.getByRole('button', { name: 'Save Cash Closing' })).toBeDisabled();
    rerender(<CashClosingActions onSave={onSave} onCancel={onCancel} canSave />);
    await userEvent.click(screen.getByRole('button', { name: 'Save Cash Closing' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSave).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });
  it('shows a saving label', () => {
    render(<CashClosingActions onSave={vi.fn()} onCancel={vi.fn()} isSaving canSave />);
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });
});

describe('CashClosingSection', () => {
  const entry = { paymentMethod: 'CASH', salesAmount: 200, refundAmount: 20, expenseAmount: 30 };

  it('renders a placeholder when there is no cash entry', () => {
    render(<CashClosingSection entry={null} value="" onChange={vi.fn()} opening="0" onOpeningChange={vi.fn()} />);
    expect(screen.getByText(/No cash payment method configured/)).toBeInTheDocument();
  });

  it('computes expected closing = opening + sales - refunds - expenses', () => {
    render(<CashClosingSection entry={entry} value="" opening="100" onChange={vi.fn()} onOpeningChange={vi.fn()} />);
    // 100 + 200 - 20 - 30 = 250
    expect(screen.getByText('₹250.00')).toBeInTheDocument();
  });

  it('shows the difference badge once an actual amount is typed', async () => {
    const onChange = vi.fn();
    render(<CashClosingSection entry={entry} value="240" opening="100" onChange={onChange} onOpeningChange={vi.fn()} />);
    expect(screen.getByText('SHORTAGE')).toBeInTheDocument(); // 240 - 250
  });

  it('surfaces a validation error', () => {
    render(<CashClosingSection entry={entry} value="" opening="0" onChange={vi.fn()} onOpeningChange={vi.fn()} error="Actual closing cash is required" />);
    expect(screen.getByText('Actual closing cash is required')).toBeInTheDocument();
  });
});

describe('DigitalPaymentSection', () => {
  it('renders a placeholder with no entries', () => {
    render(<DigitalPaymentSection entries={[]} values={{}} onChange={vi.fn()} openings={{}} onOpeningChange={vi.fn()} />);
    expect(screen.getByText(/No digital payments recorded/)).toBeInTheDocument();
  });
  it('renders one block per method with a friendly label', () => {
    render(
      <DigitalPaymentSection
        entries={[{ paymentMethod: 'UPI', salesAmount: 62 }, { paymentMethod: 'CARD', salesAmount: 30 }]}
        values={{}} openings={{ UPI: '0', CARD: '0' }} onChange={vi.fn()} onOpeningChange={vi.fn()}
      />,
    );
    expect(screen.getByText('UPI')).toBeInTheDocument();
    expect(screen.getByText('Card')).toBeInTheDocument();
  });
});

describe('CashClosingSummary', () => {
  const summary = {
    totalSales: 262,
    session: { openingDate: '2026-09-10', lastClosingDate: '2026-09-09' },
    paymentSummary: [
      { paymentMethod: 'CASH', salesAmount: 200 },
      { paymentMethod: 'UPI', salesAmount: 62 },
    ],
  };
  it('renders the session line, both sections and the total', () => {
    render(
      <CashClosingSummary
        summary={summary} actuals={{}} onActualChange={vi.fn()} cashError={null}
        cashOpening="0" onCashOpeningChange={vi.fn()} digitalOpenings={{ UPI: '0' }} onDigitalOpeningChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Opening date: 2026-09-10/)).toBeInTheDocument();
    expect(screen.getByText('CASH')).toBeInTheDocument();
    expect(screen.getByText('UPI')).toBeInTheDocument();
    expect(screen.getByText('₹262.00')).toBeInTheDocument();
  });
});
