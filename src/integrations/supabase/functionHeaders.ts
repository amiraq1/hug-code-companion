import { getSessionId, getSessionProof } from "@/lib/session";

export function getSupabaseFunctionHeaders(contentType?: string): Record<string, string> {
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const headers: Record<string, string> = {};
  headers["x-session-id"] = getSessionId();

  const sessionProof = getSessionProof();
  if (sessionProof) {
    headers["x-session-proof"] = sessionProof;
  }

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  if (!publishableKey) {
    return headers;
  }

  headers.apikey = publishableKey;

  // Supabase publishable keys (sb_publishable_*) are not JWTs.
  if (publishableKey.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${publishableKey}`;
  }

  return headers;
}
