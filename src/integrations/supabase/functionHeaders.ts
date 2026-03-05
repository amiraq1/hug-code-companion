export function getSupabaseFunctionHeaders(contentType?: string): Record<string, string> {
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const headers: Record<string, string> = {};

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
