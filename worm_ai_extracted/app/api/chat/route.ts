import { generateText, type ModelMessage } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import { isSafeModelId } from "@/lib/models";
import { getOllamaBaseUrl } from "@/lib/ollama-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const systemPrompt = `أنت مساعد عام مفيد، واضح، ومحترم. أجب باللغة التي يستخدمها الشخص. لا تقدّم تعليمات عملية لاختراق أنظمة الغير أو إنشاء برمجيات خبيثة أو تجاوز وسائل الحماية؛ عند الطلبات غير الآمنة ارفض باختصار واقترح بديلًا دفاعيًا أو تعليميًا آمنًا. لا تدّعِ تنفيذ أفعال خارج هذه المحادثة.`;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "تعذر قراءة الطلب." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "الطلب غير صالح." }, { status: 400 });
  }

  const { model, messages } = body as { model?: unknown; messages?: unknown };

  if (!isSafeModelId(model)) {
    return Response.json({ error: "اختر نموذجًا من القائمة المعتمدة." }, { status: 400 });
  }

  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 24 ||
    !messages.every(
      (message) =>
        message &&
        typeof message === "object" &&
        ["user", "assistant"].includes((message as { role?: string }).role ?? "") &&
        typeof (message as { content?: unknown }).content === "string" &&
        (message as { content: string }).content.trim().length > 0 &&
        (message as { content: string }).content.length <= 6000,
    )
  ) {
    return Response.json({ error: "تحقق من الرسائل وحاول مرة أخرى." }, { status: 400 });
  }

  const lastMessage = messages[messages.length - 1] as { role: string };
  if (lastMessage.role !== "user") {
    return Response.json({ error: "يجب أن تنتهي المحادثة برسالة منك." }, { status: 400 });
  }

  try {
    const ollama = createOllama({
      baseURL: getOllamaBaseUrl(),
      ...(process.env.OLLAMA_API_KEY
        ? { headers: { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` } }
        : {}),
    });

    const result = await generateText({
      model: ollama(model),
      system: systemPrompt,
      messages: messages as ModelMessage[],
      temperature: 0.7,
      abortSignal: request.signal,
    });

    return Response.json({ content: result.text });
  } catch {
    return Response.json(
      { error: "تعذر الاتصال بـ Ollama. تحقق من عنوان الخادم ومن تثبيت النموذج المختار." },
      { status: 502 },
    );
  }
}
