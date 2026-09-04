import { useCallback, useState } from 'react';
import cashClosingService from '../services/cashClosingService';

/**
 * Loads the backend-calculated cash closing summary for a counter
 * (opening balances, sales, refunds, expenses, expected amounts per
 * payment method). Kept out of the UI component per the project's
 * service-layer convention.
 */
export default function useCashClosingSummary() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async (counterId) => {
    if (!counterId) {
      setSummary(null);
      setError(null);
      return null;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await cashClosingService.getSummary(counterId);
      setSummary(data);
      return data;
    } catch (err) {
      setError(err);
      setSummary(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSummary(null);
    setError(null);
  }, []);

  return { summary, isLoading, error, fetchSummary, reset };
}
