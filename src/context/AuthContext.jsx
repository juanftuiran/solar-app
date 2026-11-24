import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  getSession,
  getUserRole,
  isSupabaseConfigured,
  sb,
  signIn as sbSignIn,
  signOut as sbSignOut,
} from '../modules/supabase.js';
import { state } from '../modules/state.js';
import { clearSolarmanSession } from '../modules/solarman/storage.js';

const AuthContext = createContext(null);
const ROLE_CACHE_PREFIX = 'jf_solar_role_';

function readCachedAuthState() {
  if (!isSupabaseConfigured || typeof window === 'undefined' || !window.localStorage) {
    return { user: null, isAdmin: false };
  }
  try {
    let raw = null;
    const storageKey = sb?.auth?.storageKey;
    if (storageKey) {
      raw = window.localStorage.getItem(storageKey);
    }
    if (!raw) {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k && /^sb-[a-z0-9_-]+-auth-token$/i.test(k)) {
          raw = window.localStorage.getItem(k);
          if (raw) break;
        }
      }
    }
    if (!raw) return { user: null, isAdmin: false };

    const parsed = JSON.parse(raw);
    const sessionUser = parsed?.user || parsed?.currentSession?.user || null;
    const hasToken = Boolean(
      parsed?.access_token ||
      parsed?.refresh_token ||
      parsed?.currentSession?.access_token,
    );
    if (!sessionUser?.id || !hasToken) {
      return { user: null, isAdmin: false };
    }

    const cachedRole = window.localStorage.getItem(`${ROLE_CACHE_PREFIX}${sessionUser.id}`);
    return {
      user: sessionUser,
      isAdmin: cachedRole === 'admin',
    };
  } catch {
    return { user: null, isAdmin: false };
  }
}

function writeCachedRole(userId, role) {
  if (!userId || typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(`${ROLE_CACHE_PREFIX}${userId}`, role || 'observer');
  } catch {
    // Ignore storage errors
  }
}

function clearCachedRole(userId) {
  if (!userId || typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(`${ROLE_CACHE_PREFIX}${userId}`);
  } catch {
    // Ignore storage errors
  }
}

export function AuthProvider({ children }) {
  const initialAuth = useMemo(() => readCachedAuthState(), []);

  // Sync module state immediately on first render so route guards see it at t=0
  if (initialAuth.user && !state.user) {
    state.user = initialAuth.user;
    state.isAdmin = initialAuth.isAdmin;
  }

  const [user, setUser] = useState(initialAuth.user);
  const [isAdmin, setIsAdmin] = useState(initialAuth.isAdmin);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured || Boolean(initialAuth.user));
  const [authError, setAuthError] = useState(null);
  const resolvedRoleEmailRef = useRef(null);

  const applyUserState = useCallback((sessionUser, adminFlag) => {
    state.user = sessionUser;
    state.isAdmin = adminFlag;
    resolvedRoleEmailRef.current = sessionUser?.email || null;
    if (sessionUser?.id) {
      writeCachedRole(sessionUser.id, adminFlag ? 'admin' : 'observer');
    }
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
    const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT') {
        if (state.user?.id) clearCachedRole(state.user.id);
        resolvedRoleEmailRef.current = null;
        state.user = null;
        state.isAdmin = false;
        setUser(null);
        setIsAdmin(false);
        return;
      }

      if (session?.user) {
        const nextUser = session.user;
        state.user = nextUser;
        setUser((prev) => (prev?.id === nextUser.id && prev?.email === nextUser.email ? prev : nextUser));
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
          if (state.user?.id) clearCachedRole(state.user.id);
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

  // Resolve global admin flag only when a new email appears after mount
  useEffect(() => {
    if (!authReady || !user?.email) return undefined;
    if (resolvedRoleEmailRef.current === user.email) return undefined;
    let cancelled = false;
    getUserRole(user.email).then((role) => {
      if (!cancelled) {
        const admin = role === 'admin';
        resolvedRoleEmailRef.current = user.email;
        writeCachedRole(user.id, admin ? 'admin' : 'observer');
        state.isAdmin = admin;
        setIsAdmin(admin);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authReady, user?.email, user?.id]);

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
    const prevId = state.user?.id;
    import('../modules/solarman/sync.js')
      .then((m) => m.stopSolarmanLiveSync?.())
      .catch(() => {});
    clearSolarmanSession();
    if (prevId) clearCachedRole(prevId);
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
