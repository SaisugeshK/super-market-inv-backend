import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import Loader from '../Loader';
import CounterSelect from './CounterSelect';
import CashClosingSummary from './CashClosingSummary';
import CashClosingActions from './CashClosingActions';
import useCashClosingSummary from '../../hooks/useCashClosingSummary';

/**
 * CashClosingModal
 *  ├── CounterSelect
 *  ├── CashClosingSummary
 *  │    ├── CashClosingSection      (CASH)
 *  │    └── DigitalPaymentSection   (GPAY, PHONEPE, CARD, ...)
 *  └── CashClosingActions
 *
 * Owns only UI state (selected counter, actual-amount inputs). Every
 * financial figure comes from the backend summary; onSubmit sends just the
 * actual counted/reconciled amounts, matching POST /cash-closing.
 */
export default function CashClosingModal({ show, onClose, onSubmit, isSaving }) {
  const [counterId, setCounterId] = useState('');
  const [actuals, setActuals] = useState({});
  const [cashOpening, setCashOpening] = useState('0');
  const [digitalOpenings, setDigitalOpenings] = useState({});
  const [cashError, setCashError] = useState(null);
  const { summary, isLoading, error, fetchSummary, reset } = useCashClosingSummary();

  useEffect(() => {
    if (!show) {
      setCounterId('');
      setActuals({});
      setCashOpening('0');
      setDigitalOpenings({});
      setCashError(null);
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const handleCounterChange = async (id) => {
    setCounterId(id);
    setActuals({});
    setCashOpening('0'); // typed by the user, not the backend's carried-over previous closing
    setDigitalOpenings({});
    setCashError(null);
    if (!id) {
      reset();
      return;
    }
    const data = await fetchSummary(id);
    if (data?.paymentSummary) {
      // Every opening balance (CASH and each digital method) starts at 0
      // and is typed by the user instead of trusting the backend's
      // carried-over previous-closing figure. Actual/verified amounts are
      // left blank too, so what's shown always matches what was typed.
      const openings = {};
      data.paymentSummary.forEach((p) => {
        if (p.paymentMethod !== 'CASH') openings[p.paymentMethod] = '0';
      });
      setDigitalOpenings(openings);
    }
  };

  const handleActualChange = (method, value) => {
    setActuals((prev) => ({ ...prev, [method]: value }));
    if (method === 'CASH' && cashError) setCashError(null);
  };

  const handleDigitalOpeningChange = (method, value) => {
    setDigitalOpenings((prev) => ({ ...prev, [method]: value }));
  };

  const handleSave = async () => {
    if (!counterId) return toast.error('Select a counter first');
    if (!summary) return;

    const cashValue = actuals.CASH;
    if (cashValue === '' || cashValue == null || Number.isNaN(Number(cashValue))) {
      setCashError('Actual closing cash is required');
      return;
    }

    const paymentClosings = (summary.paymentSummary || []).map((p) => ({
      paymentMethod: p.paymentMethod,
      actualAmount: Number(actuals[p.paymentMethod] ?? p.expectedClosing ?? 0),
    }));

    await onSubmit({ counterId, paymentClosings });
  };

  return (
    <Modal
      show={show}
      title="Add Cash Closing"
      size="modal-lg"
      onClose={onClose}
      footer={
        <CashClosingActions
          onCancel={onClose}
          onSave={handleSave}
          isSaving={isSaving}
          canSave={Boolean(summary)}
        />
      }
    >
      <CounterSelect value={counterId} onChange={handleCounterChange} disabled={isSaving} />

      {isLoading && <Loader label="Loading cash session summary..." />}

      {!isLoading && error && (
        <div className="alert alert-danger">Failed to load summary for this counter.</div>
      )}

      {!isLoading && !error && !summary && counterId && (
        <div className="alert alert-secondary">No cash session data available for this counter.</div>
      )}

      {!isLoading && summary && (
        <CashClosingSummary
          summary={summary}
          actuals={actuals}
          onActualChange={handleActualChange}
          cashError={cashError}
          cashOpening={cashOpening}
          onCashOpeningChange={setCashOpening}
          digitalOpenings={digitalOpenings}
          onDigitalOpeningChange={handleDigitalOpeningChange}
        />
      )}
    </Modal>
  );
}
