export function getOllamaBaseUrl() {
  const raw = process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434/api";
  const url = new URL(raw);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("OLLAMA_BASE_URL must use HTTP or HTTPS");
  }

  return url.toString().replace(/\/+$/, "");
}
