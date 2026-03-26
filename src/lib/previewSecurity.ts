const BLOCKED_TAGS = ["script", "iframe", "object", "embed", "base", "link"];
const BLOCKED_SELECTORS = ["meta[http-equiv='refresh']"];
const BLOCKED_PROTOCOLS = ["javascript:", "vbscript:", "data:text/html"];

function sanitizeNodeTree(document: Document) {
  document.querySelectorAll(BLOCKED_TAGS.join(", ")).forEach((node) => node.remove());
  document.querySelectorAll(BLOCKED_SELECTORS.join(", ")).forEach((node) => node.remove());

  document.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith("on") || name === "srcdoc") {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (
        (name === "href" || name === "src" || name === "action" || name === "formaction" || name === "xlink:href") &&
        BLOCKED_PROTOCOLS.some((protocol) => value.startsWith(protocol))
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  });
}

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

export function sanitizePreviewFragment(html: string): string {
  const document = parseHtml(html);
  sanitizeNodeTree(document);
  return document.body.innerHTML;
}

export function sanitizePreviewDocument(html: string): string {
  const document = parseHtml(html);
  sanitizeNodeTree(document);
  return `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
}
