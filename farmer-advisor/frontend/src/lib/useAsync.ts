"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export function useAsync<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async () => {
    try {
      const data = await loaderRef.current();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((current) => ({ data: current.data, error: error as Error, loading: false }));
    }
  }, []);

  useEffect(() => {
    let active = true;
    loaderRef.current().then(
      (data) => active && setState({ data, error: null, loading: false }),
      (error) => active && setState((current) => ({ data: current.data, error: error as Error, loading: false })),
    );
    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    return run();
  }, [run]);

  return { ...state, reload, setData: (data: T) => setState({ data, error: null, loading: false }) };
}
