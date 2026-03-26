import { describe, expect, it } from "vitest";
import { sanitizePreviewDocument, sanitizePreviewFragment } from "@/lib/previewSecurity";

describe("previewSecurity", () => {
  it("removes scripts and inline handlers from fragments", () => {
    const sanitized = sanitizePreviewFragment(
      `<div onclick="alert('xss')">safe</div><script>alert('boom')</script>`
    );

    expect(sanitized).toContain("safe");
    expect(sanitized).not.toContain("script");
    expect(sanitized).not.toContain("onclick");
  });

  it("removes javascript urls from whole documents", () => {
    const sanitized = sanitizePreviewDocument(`
      <!DOCTYPE html>
      <html>
        <body>
          <a href="javascript:alert('xss')">link</a>
          <iframe src="https://evil.example"></iframe>
        </body>
      </html>
    `);

    expect(sanitized).toContain("link");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("<iframe");
  });
});
