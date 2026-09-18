"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { BuyerAuthUser } from "@tradekwik/shared";
import { buyerLogout, buyerMe } from "@/lib/client-api";

interface BuyerAuthState {
  /** undefined = still loading, null = logged out */
  user: BuyerAuthUser | null | undefined;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const BuyerAuthContext = createContext<BuyerAuthState>({
  user: undefined,
  refresh: async () => undefined,
  logout: async () => undefined,
});

export function BuyerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<BuyerAuthUser | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setUser(await buyerMe());
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await buyerLogout().catch(() => undefined);
    setUser(null);
  }, []);

  return (
    <BuyerAuthContext.Provider value={{ user, refresh, logout }}>{children}</BuyerAuthContext.Provider>
  );
}

export function useBuyerAuth(): BuyerAuthState {
  return useContext(BuyerAuthContext);
}
