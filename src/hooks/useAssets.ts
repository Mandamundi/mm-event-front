import { useState, useEffect } from 'react';

export function useAssets() {
  const [assets, setAssets] = useState<any[]>([]);
  const [groupedAssets, setGroupedAssets] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAssets() {
      try {
        const res = await fetch(`https://mm-event-api.onrender.com/api/assets`);
        if (!res.ok) throw new Error('Failed to fetch assets');
        const data = await res.json();
        setAssets(data.assets || []);
        setGroupedAssets(data.grouped || {});
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAssets();
  }, []);

  return { assets, groupedAssets, isLoading, error };
}
