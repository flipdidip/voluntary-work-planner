import { useCallback, useEffect, useState } from "react";
import { PartnerAppointmentIndex } from "@shared/types";

export function usePartnerAppointments(): {
  index: PartnerAppointmentIndex | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [index, setIndex] = useState<PartnerAppointmentIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.getPartnerAppointments();
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
