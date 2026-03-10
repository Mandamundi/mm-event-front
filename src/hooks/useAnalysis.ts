import { useState, useEffect, useRef } from 'react';

export function useAnalysis(params: any) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!params.event_ids || params.event_ids.length === 0 || !params.ticker) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`https://mm-event-api.up.railway.app/api/analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) throw new Error('Could not load data — check connection');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchData, 300);
    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    params.event_ids?.join(','),
    params.ticker,
    params.phase,
    params.pre_days,
    params.post_days,
    params.benchmark_ticker,
    params.second_ticker
  ]);

  return { data, isLoading, error };
}
