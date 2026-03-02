import { useCallback, useEffect, useState } from "react";
import { VolunteerIndex, VolunteerIndexEntry, Volunteer } from "@shared/types";

export function useVolunteerIndex(): {
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
      const result = await window.api.getVolunteerIndex();
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

export function useVolunteer(id: string | undefined): {
  volunteer: Volunteer | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
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
      const result = await window.api.getVolunteer(id);
      setVolunteer(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { volunteer, loading, error, refresh };
}
