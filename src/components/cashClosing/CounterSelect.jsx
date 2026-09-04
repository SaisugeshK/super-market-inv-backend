import { useEffect, useState } from 'react';
import billingCountersService from '../../services/billingCountersService';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);

/**
 * Step 1 of the Cash Closing flow — choosing a counter triggers the
 * backend summary fetch (wired by the parent CashClosingModal).
 */
export default function CounterSelect({ value, onChange, disabled = false }) {
  const [counters, setCounters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    billingCountersService
      .getAll()
      .then((data) => setCounters(asList(data)))
      .catch(() => setCounters([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="mb-3">
      <label htmlFor="cashClosingCounter" className="form-label">
        Counter <span className="text-danger">*</span>
      </label>
      <select
        id="cashClosingCounter"
        className="form-select"
        value={value ?? ''}
        disabled={disabled || isLoading}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
      >
        <option value="">{isLoading ? 'Loading counters...' : 'Select counter'}</option>
        {counters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.counterName || c.name || `Counter #${c.id}`}
          </option>
        ))}
      </select>
    </div>
  );
}
