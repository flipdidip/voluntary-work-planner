import { useCallback, useEffect, useState } from "react";
import { HauptamtlicheIndex } from "@shared/types";

export function useHauptamtliche(): {
  index: HauptamtlicheIndex | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [index, setIndex] = useState<HauptamtlicheIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setIndex(await window.api.getHauptamtliche());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { index, loading, error, refresh };
}
