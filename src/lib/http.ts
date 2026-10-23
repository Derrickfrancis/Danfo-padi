// Reads a request body as text, but gives up as soon as it is bigger than the
// limit. We never hold more than the limit in memory, even if the sender lies
// about the size or sends it slowly in many pieces. Returns null if too big.
export async function readLimitedText(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let text = "";

  let chunk = await reader.read();
  while (!chunk.done) {
    receivedBytes += chunk.value.byteLength;
    if (receivedBytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    // "stream: true" keeps a character that is split between two pieces intact.
    text += decoder.decode(chunk.value, { stream: true });
    chunk = await reader.read();
  }

  text += decoder.decode();
  return text;
}

// A JSON answer with safe headers. "no-store" means browsers and proxies must
// not keep a copy, and "nosniff" stops browsers from guessing it is something else.
export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      // Extra headers go first, so they can never replace the safe ones below.
      ...extraHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
