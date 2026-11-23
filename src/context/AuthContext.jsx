import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getSession,
  getUserRole,
  isSupabaseConfigured,
  sb,
  signIn as sbSignIn,
  signOut as sbSignOut,
} from '../modules/supabase.js';
import { state } from '../modules/state.js';
import { clearSolarmanSession, stopSolarmanLiveSync } from '../modules/solarman.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [authError, setAuthError] = useState(null);

  const hydrateUser = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      state.user = null;
      state.isAdmin = false;
      setUser(null);
      setIsAdmin(false);
      return null;
    }
    const role = await getUserRole(sessionUser.email);
    const admin = role === 'admin';
    state.user = sessionUser;
    state.isAdmin = admin;
    setUser(sessionUser);
    setIsAdmin(admin);
    return { user: sessionUser, isAdmin: admin };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthReady(true);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const session = await getSession();
        if (!cancelled) {
          await hydrateUser(session?.user || null);
        }
      } catch (err) {
        if (!cancelled) {
          setAuthError(err?.message || 'Error checking session');
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();

    const { data: listener } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      await hydrateUser(session?.user || null);
    });

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe?.();
    };
  }, [hydrateUser]);

  const signIn = useCallback(async (email, password) => {
    setAuthError(null);
    const result = await sbSignIn(email, password);
    if (result.error || !result.user) {
      return { user: null, error: result.error || new Error('Invalid credentials') };
    }
    const hydrated = await hydrateUser(result.user);
    return { user: hydrated?.user || result.user, isAdmin: hydrated?.isAdmin || false, error: null };
  }, [hydrateUser]);

  const signOut = useCallback(async () => {
    stopSolarmanLiveSync();
    clearSolarmanSession();
    await sbSignOut();
    await hydrateUser(null);
  }, [hydrateUser]);

  const value = useMemo(() => ({
    isConfigured: isSupabaseConfigured,
    user,
    isAdmin,
    authReady,
    authError,
    signIn,
    signOut,
  }), [user, isAdmin, authReady, authError, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
