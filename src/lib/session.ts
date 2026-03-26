const SESSION_KEY = "hc_session_id";
const SESSION_PROOF_KEY = "hc_session_proof";
const LEGACY_SESSION_KEY = "hugcode_session";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function encode(value: string): string {
  return btoa(encodeURIComponent(value).split("").reverse().join(""));
}

function decode(value: string): string {
  try {
    return decodeURIComponent(atob(value).split("").reverse().join(""));
  } catch {
    return value;
  }
}

export function isValidSessionId(value: string | null | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export function isValidSessionProof(value: string | null | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value));
}

export function getStoredValue(key: string): string | null {
  if (!canUseStorage()) return null;

  const raw = window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
  if (!raw) return null;

  const decoded = decode(raw);
  return decoded || null;
}

export function setStoredValue(key: string, value: string, persistent = false): void {
  if (!canUseStorage()) return;

  const encoded = encode(value);
  if (persistent) {
    window.localStorage.setItem(key, encoded);
    return;
  }

  window.sessionStorage.setItem(key, encoded);
}

export function removeStoredValue(key: string): void {
  if (!canUseStorage()) return;

  window.sessionStorage.removeItem(key);
  window.localStorage.removeItem(key);
}

function migrateLegacySessionId(): string | null {
  if (!canUseStorage()) return null;

  const legacy =
    window.localStorage.getItem(LEGACY_SESSION_KEY) || window.sessionStorage.getItem(LEGACY_SESSION_KEY);

  if (!isValidSessionId(legacy)) return null;

  setStoredValue(SESSION_KEY, legacy, true);
  window.localStorage.removeItem(LEGACY_SESSION_KEY);
  window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
  return legacy;
}

export function getSessionId(): string {
  const existing = getStoredValue(SESSION_KEY);
  if (isValidSessionId(existing)) return existing;

  const migrated = migrateLegacySessionId();
  if (migrated) return migrated;

  const sessionId = crypto.randomUUID();
  setStoredValue(SESSION_KEY, sessionId, true);
  return sessionId;
}

export function persistSessionId(sessionId: string): string {
  if (!isValidSessionId(sessionId)) {
    throw new Error("Invalid session id");
  }

  setStoredValue(SESSION_KEY, sessionId, true);
  return sessionId;
}

export function getSessionProof(): string | null {
  const proof = getStoredValue(SESSION_PROOF_KEY);
  return isValidSessionProof(proof) ? proof : null;
}

export function persistSessionProof(proof: string): string {
  if (!isValidSessionProof(proof)) {
    throw new Error("Invalid session proof");
  }

  setStoredValue(SESSION_PROOF_KEY, proof, true);
  return proof;
}

export function clearSessionProof(): void {
  removeStoredValue(SESSION_PROOF_KEY);
}

export { SESSION_KEY, SESSION_PROOF_KEY };
