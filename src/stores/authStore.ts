/**
 * Shared auth store for GitHub OAuth state.
 * This keeps every consumer in sync instead of creating isolated hook-local state.
 */

import { useEffect, useSyncExternalStore } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { getSupabaseFunctionHeaders } from "@/integrations/supabase/functionHeaders";
import {
  clearSessionProof,
  getSessionId,
  getStoredValue,
  persistSessionProof,
  removeStoredValue,
  setStoredValue,
} from "@/lib/session";

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

const CSRF_KEY = "hc_oauth_csrf";
const AUTH_CACHE_KEY = "hc_auth_cache";
const NATIVE_GITHUB_SCHEME =
  import.meta.env.VITE_NATIVE_GITHUB_SCHEME || "app.lovable.b18996c477644e5c8e878b0ec5e83922";
const NATIVE_GITHUB_HOST = import.meta.env.VITE_NATIVE_GITHUB_HOST || "github-auth";
const sessionId = getSessionId();

let authState: AuthState = {
  status: "loading",
  username: null,
  error: null,
  sessionId,
};

const listeners = new Set<() => void>();
let hasInitialized = false;
let pendingStatusCheck: Promise<void> | null = null;
let nativeAuthListenerReady = false;

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function updateAuthState(next: AuthState | ((prev: AuthState) => AuthState)) {
  authState = typeof next === "function" ? next(authState) : next;
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return authState;
}

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

interface AuthCache {
  username: string;
  cachedAt: number;
}

const CACHE_TTL = 5 * 60 * 1000;

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

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

function getAppOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "http://localhost";
}

function getOAuthRedirectUri(): string {
  if (!isNativePlatform()) {
    return getAppOrigin();
  }

  return `${NATIVE_GITHUB_SCHEME}://${NATIVE_GITHUB_HOST}`;
}

function buildAuthorizeUrl(csrf: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
  const params = new URLSearchParams({
    session_id: sessionId,
    redirect_uri: getOAuthRedirectUri(),
    app_origin: getAppOrigin(),
    csrf_token: csrf,
  });

  return `https://${projectId}.supabase.co/functions/v1/github-auth/authorize?${params.toString()}`;
}

function setAuthError(type: AuthErrorType, message: string): void {
  updateAuthState((prev) => ({
    ...prev,
    status: "error",
    error: { type, message, timestamp: Date.now() },
  }));
}

function decodeAuthParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function consumeAuthCallback(urlString: string): boolean {
  let url: URL;

  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  const githubConnected = url.searchParams.get("github_connected");
  const csrfToken = url.searchParams.get("csrf_token");
  const errorParam = url.searchParams.get("auth_error");
  const username = url.searchParams.get("github_username");
  const sessionProof = url.searchParams.get("session_proof");

  if (!githubConnected && !errorParam) {
    return false;
  }

  if (sessionProof) {
    try {
      persistSessionProof(sessionProof);
    } catch {
      clearSessionProof();
    }
  }

  if (errorParam) {
    clearCachedAuth();
    clearSessionProof();
    setAuthError("oauth", decodeAuthParam(errorParam));
    return true;
  }

  if (githubConnected === "true") {
    if (csrfToken && !validateAndConsumeCsrf(csrfToken)) {
      clearCachedAuth();
      clearSessionProof();
      setAuthError("csrf", "Security check failed. Please try again.");
      return true;
    }

    if (username) {
      setCachedAuth(username);
      updateAuthState((prev) => ({
        ...prev,
        status: "authenticated",
        username,
        error: null,
      }));
      void checkAuthStatus(true);
      return true;
    }
  }

  void checkAuthStatus(true);
  return true;
}

async function ensureNativeAuthListener(): Promise<void> {
  if (!isNativePlatform() || nativeAuthListenerReady) return;

  nativeAuthListenerReady = true;
  await App.addListener("appUrlOpen", async ({ url }) => {
    if (!consumeAuthCallback(url)) return;

    try {
      await Browser.close();
    } catch {
      // Browser.close is effectively a no-op on Android custom tabs.
    }
  });
}

export async function checkAuthStatus(skipCache = false): Promise<void> {
  if (pendingStatusCheck) {
    return pendingStatusCheck;
  }

  pendingStatusCheck = (async () => {
    if (!navigator.onLine) {
      const cached = getCachedAuth();
      if (cached) {
        updateAuthState((prev) => ({
          ...prev,
          status: "authenticated",
          username: cached.username,
          error: null,
        }));
      } else {
        setAuthError("network", "No internet connection.");
      }
      return;
    }

    if (!skipCache) {
      const cached = getCachedAuth();
      if (cached) {
        updateAuthState((prev) => ({
          ...prev,
          status: "authenticated",
          username: cached.username,
          error: null,
        }));
        return;
      }
    }

    updateAuthState((prev) => ({ ...prev, status: "loading" }));

    try {
      const timeout = createTimeoutSignal(10_000);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
      let response: Response;

      try {
        response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/github-auth/status?session_id=${sessionId}`,
          {
            credentials: "include",
            headers: getSupabaseFunctionHeaders(),
            signal: timeout.signal,
          }
        );
      } finally {
        timeout.clear();
      }

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.connected && data.username) {
        setCachedAuth(data.username);
        updateAuthState((prev) => ({
          ...prev,
          status: "authenticated",
          username: data.username,
          error: null,
        }));
        return;
      }

      clearCachedAuth();
      clearSessionProof();
      updateAuthState((prev) => ({
        ...prev,
        status: "unauthenticated",
        username: null,
        error: null,
      }));
    } catch (error: unknown) {
      const cached = getCachedAuth();
      if (cached) {
        updateAuthState((prev) => ({
          ...prev,
          status: "authenticated",
          username: cached.username,
          error: null,
        }));
        return;
      }

      setAuthError("server", (error as Error).message || "Failed to verify authentication state.");
    }
  })();

  try {
    await pendingStatusCheck;
  } finally {
    pendingStatusCheck = null;
  }
}

function initializeAuthStore() {
  if (hasInitialized) return;
  hasInitialized = true;

  void ensureNativeAuthListener();

  const handledCallback = consumeAuthCallback(window.location.href);
  if (handledCallback && !isNativePlatform()) {
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    return;
  }

  if (handledCallback) return;

  void checkAuthStatus();
}

export function connectAuth(): void {
  const csrf = generateCsrfToken();
  const authorizeUrl = buildAuthorizeUrl(csrf);

  updateAuthState((prev) => ({ ...prev, status: "loading", error: null }));

  if (isNativePlatform()) {
    void ensureNativeAuthListener();
    void Browser.open({ url: authorizeUrl }).catch(() => {
      window.location.href = authorizeUrl;
    });
    return;
  }

  window.location.href = authorizeUrl;
}

export async function disconnectAuth(): Promise<void> {
  updateAuthState((prev) => ({ ...prev, status: "loading" }));

  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
    await fetch(`https://${projectId}.supabase.co/functions/v1/github-auth/disconnect`, {
      method: "POST",
      credentials: "include",
      headers: getSupabaseFunctionHeaders("application/json"),
      body: JSON.stringify({ session_id: sessionId }),
    });
  } catch {
    // Local cleanup still matters even when the server request fails.
  }

  clearCachedAuth();
  clearSessionProof();
  removeStoredValue(CSRF_KEY);
  updateAuthState({
    status: "unauthenticated",
    username: null,
    error: null,
    sessionId,
  });
}

export function clearAuthError(): void {
  updateAuthState((prev) => ({ ...prev, error: null }));
}

export function useAuthStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    initializeAuthStore();
  }, []);

  return {
    ...snapshot,
    isAuthenticated: snapshot.status === "authenticated",
    isLoading: snapshot.status === "loading",
    connect: connectAuth,
    disconnect: disconnectAuth,
    clearError: clearAuthError,
    retry: () => checkAuthStatus(true),
    checkStatus: checkAuthStatus,
  };
}
