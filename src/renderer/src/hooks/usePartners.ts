import { useCallback, useEffect, useState } from "react";
import { VolunteerIndex, Volunteer } from "@shared/types";

export function usePartnerIndex(): {
  index: VolunteerIndex | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [index, setIndex] = useState<VolunteerIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.getPartnerIndex();
      setIndex(result);
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

export function usePartner(id: string | undefined): {
  partner: Volunteer | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [partner, setPartner] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.getPartner(id);
      setPartner(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { partner, loading, error, refresh };
}
