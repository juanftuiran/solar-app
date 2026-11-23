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

  const applyUserState = useCallback((sessionUser, adminFlag) => {
    state.user = sessionUser;
    state.isAdmin = adminFlag;
    setUser(sessionUser);
    setIsAdmin(adminFlag);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthReady(true);
      return undefined;
    }

    let cancelled = false;

    // IMPORTANT: Never await Supabase DB queries inside onAuthStateChange in supabase-js v2;
    // doing so deadlocks getSession()/signInWithPassword() on the internal auth lock.
    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const nextUser = session?.user || null;
      state.user = nextUser;
      setUser(nextUser);
      if (!nextUser) {
        state.isAdmin = false;
        setIsAdmin(false);
      }
    });

    (async () => {
      try {
        const session = await getSession();
        if (cancelled) return;
        const sessionUser = session?.user || null;
        if (sessionUser) {
          const role = await getUserRole(sessionUser.email);
          if (!cancelled) {
            applyUserState(sessionUser, role === 'admin');
          }
        } else {
          applyUserState(null, false);
        }
      } catch (err) {
        if (!cancelled) {
          setAuthError(err?.message || 'Error checking session');
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe?.();
    };
  }, [applyUserState]);

  // Keep global admin flag synced if user changes via auth event after mount
  useEffect(() => {
    if (!authReady || !user?.email) return undefined;
    let cancelled = false;
    getUserRole(user.email).then((role) => {
      if (!cancelled) {
        const admin = role === 'admin';
        state.isAdmin = admin;
        setIsAdmin(admin);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authReady, user?.email]);

  const signIn = useCallback(async (email, password) => {
    setAuthError(null);
    const result = await sbSignIn(email, password);
    if (result.error || !result.user) {
      return { user: null, error: result.error || new Error('Invalid credentials') };
    }
    const role = await getUserRole(result.user.email);
    const admin = role === 'admin';
    applyUserState(result.user, admin);
    return { user: result.user, isAdmin: admin, error: null };
  }, [applyUserState]);

  const signOut = useCallback(async () => {
    stopSolarmanLiveSync();
    clearSolarmanSession();
    await sbSignOut();
    applyUserState(null, false);
  }, [applyUserState]);

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
