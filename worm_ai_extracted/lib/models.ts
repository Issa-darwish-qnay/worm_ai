export const SAFE_MODELS = [
  {
    id: "llama3.2:3b",
    name: "Llama 3.2 · 3B",
    command: "ollama run llama3.2:3b",
    note: "سريع وخفيف",
  },
  {
    id: "qwen2.5:7b",
    name: "Qwen 2.5 · 7B",
    command: "ollama run qwen2.5:7b",
    note: "متوازن للمهام العامة",
  },
  {
    id: "gemma3:4b",
    name: "Gemma 3 · 4B",
    command: "ollama run gemma3:4b",
    note: "نموذج عام متعدد الاستخدامات",
  },
] as const;

export type SafeModelId = (typeof SAFE_MODELS)[number]["id"];

export function isSafeModelId(value: unknown): value is SafeModelId {
  return typeof value === "string" && SAFE_MODELS.some((model) => model.id === value);
}
