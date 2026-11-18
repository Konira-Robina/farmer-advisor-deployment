"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setUnauthorizedHandler } from "@/lib/api";
import type { User } from "@/lib/types";

type Status = "loading" | "authed" | "anon";

interface AuthValue {
  status: Status;
  user: User | null;
  signIn: (user: User) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: Status; user: User | null }>({ status: "loading", user: null });

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((user) => active && setState({ status: "authed", user }))
      .catch(() => active && setState({ status: "anon", user: null }));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setState({ status: "anon", user: null }));
    return () => setUnauthorizedHandler(null);
  }, []);

  const signIn = useCallback((user: User) => setState({ status: "authed", user }), []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setState({ status: "anon", user: null });
    }
  }, []);

  const value = useMemo<AuthValue>(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
