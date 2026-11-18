"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { Thread } from "@/lib/types";

interface ThreadsValue {
  threads: Thread[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  remove: (id: string) => void;
}

const ThreadsContext = createContext<ThreadsValue | null>(null);

export function ThreadsProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await api.threads();
      setThreads(list);
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api
      .threads()
      .then((list) => {
        if (active) {
          setThreads(list);
          setLoading(false);
        }
      })
      .catch((caught: Error) => {
        if (active) {
          setError(caught.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const remove = useCallback((id: string) => setThreads((current) => current.filter((thread) => thread.id !== id)), []);

  const value = useMemo(() => ({ threads, loading, error, refresh, remove }), [threads, loading, error, refresh, remove]);
  return <ThreadsContext.Provider value={value}>{children}</ThreadsContext.Provider>;
}

export function useThreads(): ThreadsValue {
  const context = useContext(ThreadsContext);
  if (!context) throw new Error("useThreads must be used inside ThreadsProvider");
  return context;
}
