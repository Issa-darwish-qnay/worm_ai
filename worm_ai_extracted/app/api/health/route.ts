import { SAFE_MODELS } from "@/lib/models";
import { getOllamaBaseUrl } from "@/lib/ollama-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const baseUrl = getOllamaBaseUrl();
    const response = await fetch(`${baseUrl}/tags`, {
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
      headers: process.env.OLLAMA_API_KEY
        ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` }
        : undefined,
    });

    if (!response.ok) {
      return Response.json({ connected: false, installed: [] }, { status: 503 });
    }

    const payload = (await response.json()) as { models?: Array<{ name?: string; model?: string }> };
    const installedNames = new Set(
      (payload.models ?? []).flatMap((model) => [model.name, model.model].filter(Boolean)),
    );
    const installed = SAFE_MODELS.filter((model) => installedNames.has(model.id)).map((model) => model.id);

    return Response.json({ connected: true, installed });
  } catch {
    return Response.json({ connected: false, installed: [] }, { status: 503 });
  }
}
