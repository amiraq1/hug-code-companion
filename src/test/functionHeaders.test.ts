import { beforeEach, describe, expect, it } from "vitest";
import { getSupabaseFunctionHeaders } from "@/integrations/supabase/functionHeaders";
import { persistSessionProof } from "@/lib/session";

describe("getSupabaseFunctionHeaders", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("includes the native session proof header when stored locally", () => {
    persistSessionProof("signedPayload.signature");

    const headers = getSupabaseFunctionHeaders("application/json");

    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["x-session-id"]).toBeTruthy();
    expect(headers["x-session-proof"]).toBe("signedPayload.signature");
  });

  it("omits x-session-proof when no proof is stored", () => {
    const headers = getSupabaseFunctionHeaders();

    expect(headers["x-session-id"]).toBeTruthy();
    expect(headers["x-session-proof"]).toBeUndefined();
  });
});
