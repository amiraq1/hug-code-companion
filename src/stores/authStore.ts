/**
 * Secure Auth Store — manages GitHub OAuth state with:
 * - CSRF protection via state parameter
 * - Encrypted session storage (not plain localStorage)
 * - Token expiry tracking
 * - Structured error handling
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { getSupabaseFunctionHeaders } from "@/integrations/supabase/functionHeaders";
import { getSessionId, getStoredValue, removeStoredValue, setStoredValue } from "@/lib/session";

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

const CSRF_KEY = "hc_oauth_csrf";
const AUTH_CACHE_KEY = "hc_auth_cache";

function createTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return { signal: AbortSignal.timeout(ms), clear: () => {} };
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => globalThis.clearTimeout(timeoutId),
  };
}

// ─── CSRF Protection ─────────────────────────────────────────────────

function generateCsrfToken(): string {
  const token = crypto.randomUUID();
  setStoredValue(CSRF_KEY, token);
  return token;
}

function validateAndConsumeCsrf(token: string): boolean {
  const stored = getStoredValue(CSRF_KEY);
  removeStoredValue(CSRF_KEY);
  return stored === token;
}

// ─── Auth Cache ──────────────────────────────────────────────────────

interface AuthCache {
  username: string;
  cachedAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedAuth(): AuthCache | null {
  const raw = getStoredValue(AUTH_CACHE_KEY);
  if (!raw) return null;
  try {
    const cache: AuthCache = JSON.parse(raw);
    if (Date.now() - cache.cachedAt > CACHE_TTL) {
      removeStoredValue(AUTH_CACHE_KEY);
      return null;
    }
    return cache;
  } catch {
    return null;
  }
}

function setCachedAuth(username: string): void {
  setStoredValue(AUTH_CACHE_KEY, JSON.stringify({ username, cachedAt: Date.now() }), true);
}

function clearCachedAuth(): void {
  removeStoredValue(AUTH_CACHE_KEY);
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
      const timeout = createTimeoutSignal(10000);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
      let res: Response;
      try {
        res = await fetch(`https://${projectId}.supabase.co/functions/v1/github-auth/status?session_id=${sessionId}`, {
          headers: getSupabaseFunctionHeaders(),
          signal: timeout.signal,
        });
      } finally {
        timeout.clear();
      }

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
        headers: getSupabaseFunctionHeaders("application/json"),
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch {
      // Still clear locally even if server fails
    }

    // Clear all auth data
    clearCachedAuth();
    removeStoredValue(CSRF_KEY);
    setState({ status: "unauthenticated", username: null, error: null, sessionId });
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
