import { useCallback, useEffect, useState } from 'react';
import { andalasApi } from '../lib/api';

export function useAndalasApi<T>(url: string | null) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(!!url);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        if (!url) return;
        setLoading(true);
        setError(null);
        try {
            const result = await andalasApi.get<T>(url);
            setData(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Gagal memuat data');
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { data, loading, error, reload };
}
