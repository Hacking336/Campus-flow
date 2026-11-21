import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  setData: (value: T | null) => void;
}

export function useApi<T>(path: string | null, deps: unknown[] = []): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [nonce, setNonce] = useState(0);
  const requestId = useRef(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    let active = true;
    setLoading(true);
    setError(null);

    api<T>(path)
      .then((payload) => {
        if (active && id === requestId.current) setData(payload);
      })
      .catch((err: unknown) => {
        if (active && id === requestId.current) {
          setError(err instanceof ApiError ? err.message : "Unable to load this page.");
        }
      })
      .finally(() => {
        if (active && id === requestId.current) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps]);

  return { data, error, loading, reload, setData };
}
