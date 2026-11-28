import { useCallback, useEffect, useState } from "react";
import * as authApi from "../api/auth";
import { getSession, setSession, subscribeToSession } from "../api/sessionStore";
import { AuthContext } from "./auth";

export function AuthProvider({ children }) {
  const [session, setLocalSession] = useState(getSession);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => subscribeToSession(setLocalSession), []);

  useEffect(() => {
    let mounted = true;
    authApi.refreshSession()
      .catch(() => setSession(null))
      .finally(() => {
        if (mounted) setIsInitializing(false);
      });
    return () => { mounted = false; };
  }, []);

  const login = useCallback((credentials) => authApi.login(credentials), []);
  const logout = useCallback(() => authApi.logout(), []);
  const clearSession = useCallback(() => setSession(null), []);
  const refreshSession = useCallback(() => authApi.refreshSession(), []);
  const updateUser = useCallback((user) => {
    const current = getSession();
    if (current && user) setSession({ ...current, user: { ...current.user, ...user } });
  }, []);

  const value = {
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.accessToken && session?.user),
    isInitializing,
    login,
    logout,
    clearSession,
    refreshSession,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
