function extractDeltaText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const maybeChoices = (payload as { choices?: Array<{ delta?: { content?: string } }> }).choices;
  return maybeChoices?.[0]?.delta?.content || "";
}

export async function readAssistantTextStream(
  response: Response,
  onText?: (accumulated: string) => void
): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";

  const handleLine = (rawLine: string) => {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (!line || line.startsWith(":") || !line.startsWith("data: ")) return;

    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") return;

    const parsed = JSON.parse(payload);
    const text = extractDeltaText(parsed);
    if (!text) return;

    accumulated += text;
    onText?.(accumulated);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const rawLine = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      try {
        handleLine(rawLine);
      } catch {
        buffer = `${rawLine}\n${buffer}`;
        break;
      }

      newlineIndex = buffer.indexOf("\n");
    }
  }

  if (buffer.trim()) {
    for (const rawLine of buffer.split("\n")) {
      try {
        handleLine(rawLine);
      } catch {
        // Ignore malformed trailing chunks.
      }
    }
  }

  return accumulated.trim();
}
