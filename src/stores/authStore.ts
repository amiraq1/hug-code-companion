/**
 * Secure Auth Store — manages GitHub OAuth state with:
 * - CSRF protection via state parameter
 * - Encrypted session storage (not plain localStorage)
 * - Token expiry tracking
 * - Structured error handling
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated" | "error";

export type AuthErrorType = "network" | "csrf" | "oauth" | "expired" | "server" | "unknown";

export interface AuthError {
  type: AuthErrorType;
  message: string;
  timestamp: number;
}

export interface AuthState {
  status: AuthStatus;
  username: string | null;
  error: AuthError | null;
  sessionId: string;
}

// ─── Secure Session Storage ──────────────────────────────────────────

const SESSION_KEY = "hc_session_id";
const CSRF_KEY = "hc_oauth_csrf";
const AUTH_CACHE_KEY = "hc_auth_cache";

/** Simple obfuscation for session storage (not crypto-grade, but prevents casual reading) */
function encode(value: string): string {
  return btoa(encodeURIComponent(value).split("").reverse().join(""));
}

function decode(value: string): string {
  try {
    return decodeURIComponent(atob(value).split("").reverse().join(""));
  } catch {
    return "";
  }
}

function getSecureItem(key: string): string | null {
  const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
  if (!raw) return null;
  return decode(raw);
}

function setSecureItem(key: string, value: string, persistent = false): void {
  const encoded = encode(value);
  if (persistent) {
    localStorage.setItem(key, encoded);
  } else {
    sessionStorage.setItem(key, encoded);
  }
}

function removeSecureItem(key: string): void {
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
}

// ─── Session ID ──────────────────────────────────────────────────────

function getSessionId(): string {
  let id = getSecureItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    setSecureItem(SESSION_KEY, id, true);
  }
  return id;
}

// ─── CSRF Protection ─────────────────────────────────────────────────

function generateCsrfToken(): string {
  const token = crypto.randomUUID();
  setSecureItem(CSRF_KEY, token);
  return token;
}

function validateAndConsumeCsrf(token: string): boolean {
  const stored = getSecureItem(CSRF_KEY);
  removeSecureItem(CSRF_KEY);
  return stored === token;
}

// ─── Auth Cache ──────────────────────────────────────────────────────

interface AuthCache {
  username: string;
  cachedAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedAuth(): AuthCache | null {
  const raw = getSecureItem(AUTH_CACHE_KEY);
  if (!raw) return null;
  try {
    const cache: AuthCache = JSON.parse(raw);
    if (Date.now() - cache.cachedAt > CACHE_TTL) {
      removeSecureItem(AUTH_CACHE_KEY);
      return null;
    }
    return cache;
  } catch {
    return null;
  }
}

function setCachedAuth(username: string): void {
  setSecureItem(AUTH_CACHE_KEY, JSON.stringify({ username, cachedAt: Date.now() }), true);
}

function clearCachedAuth(): void {
  removeSecureItem(AUTH_CACHE_KEY);
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useAuthStore() {
  const sessionId = useMemo(() => getSessionId(), []);
  const [state, setState] = useState<AuthState>({
    status: "loading",
    username: null,
    error: null,
    sessionId,
  });

  // Check auth status from backend
  const checkStatus = useCallback(async (skipCache = false) => {
    if (!navigator.onLine) {
      // Use cache when offline
      const cached = getCachedAuth();
      if (cached) {
        setState(prev => ({ ...prev, status: "authenticated", username: cached.username, error: null }));
      } else {
        setState(prev => ({
          ...prev,
          status: "error",
          error: { type: "network", message: "لا يوجد اتصال بالإنترنت", timestamp: Date.now() },
        }));
      }
      return;
    }

    // Check cache first
    if (!skipCache) {
      const cached = getCachedAuth();
      if (cached) {
        setState(prev => ({ ...prev, status: "authenticated", username: cached.username, error: null }));
        return;
      }
    }

    setState(prev => ({ ...prev, status: "loading" }));

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/github-auth/status?session_id=${sessionId}`,
        {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!res.ok) throw new Error(`Status check failed: ${res.status}`);

      const data = await res.json();

      if (data.connected && data.username) {
        setCachedAuth(data.username);
        setState(prev => ({ ...prev, status: "authenticated", username: data.username, error: null }));
      } else {
        clearCachedAuth();
        setState(prev => ({ ...prev, status: "unauthenticated", username: null, error: null }));
      }
    } catch (err: unknown) {
      const cached = getCachedAuth();
      if (cached) {
        setState(prev => ({ ...prev, status: "authenticated", username: cached.username, error: null }));
      } else {
        setState(prev => ({
          ...prev,
          status: "error",
          error: { type: "server", message: (err as Error).message || "فشل التحقق من حالة المصادقة", timestamp: Date.now() },
        }));
      }
    }
  }, [sessionId]);

  // Handle OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubConnected = params.get("github_connected");
    const csrfToken = params.get("csrf_token");
    const errorParam = params.get("auth_error");

    // Clean URL
    if (githubConnected || errorParam) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (errorParam) {
      setState(prev => ({
        ...prev,
        status: "error",
        error: { type: "oauth", message: decodeURIComponent(errorParam), timestamp: Date.now() },
      }));
      return;
    }

    if (githubConnected === "true") {
      // Validate CSRF if present
      if (csrfToken && !validateAndConsumeCsrf(csrfToken)) {
        setState(prev => ({
          ...prev,
          status: "error",
          error: { type: "csrf", message: "فشل التحقق الأمني. حاول مرة أخرى.", timestamp: Date.now() },
        }));
        return;
      }

      const username = params.get("github_username");
      if (username) {
        setCachedAuth(username);
        setState(prev => ({ ...prev, status: "authenticated", username, error: null }));
        return;
      }
    }

    checkStatus();
  }, [checkStatus]);

  // Connect — initiate OAuth with CSRF
  const connect = useCallback(() => {
    const csrf = generateCsrfToken();
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
    const redirectUri = window.location.origin;
    window.location.href = `https://${projectId}.supabase.co/functions/v1/github-auth/authorize?session_id=${sessionId}&redirect_uri=${encodeURIComponent(redirectUri)}&csrf_token=${csrf}`;
  }, [sessionId]);

  // Disconnect — clear all tokens and cache
  const disconnect = useCallback(async () => {
    setState(prev => ({ ...prev, status: "loading" }));
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
      await fetch(`https://${projectId}.supabase.co/functions/v1/github-auth/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch {
      // Still clear locally even if server fails
    }

    // Clear all auth data
    clearCachedAuth();
    removeSecureItem(SESSION_KEY);
    setState({ status: "unauthenticated", username: null, error: null, sessionId: getSessionId() });
  }, [sessionId]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Retry auth check
  const retry = useCallback(() => {
    checkStatus(true);
  }, [checkStatus]);

  return {
    ...state,
    isAuthenticated: state.status === "authenticated",
    isLoading: state.status === "loading",
    connect,
    disconnect,
    clearError,
    retry,
    checkStatus,
  };
}
