"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { SAFE_MODELS, type SafeModelId } from "@/lib/models";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ConnectionState = "idle" | "checking" | "online" | "offline";

const suggestions = [
  "اشرح لي فكرة الذكاء الاصطناعي ببساطة",
  "ساعدني في كتابة خطة لمشروع صغير",
  "لخّص لي طريقة تنظيم يومي",
];

export default function ChatWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<SafeModelId>(SAFE_MODELS[0].id);
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedModel = SAFE_MODELS.find((item) => item.id === model) ?? SAFE_MODELS[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function checkConnection() {
    setConnection("checking");
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const data = (await response.json()) as { connected?: boolean; installed?: string[] };
      setConnection(data.connected ? "online" : "offline");
      setInstalledModels(data.installed ?? []);
    } catch {
      setConnection("offline");
      setInstalledModels([]);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: nextMessages }),
      });
      const data = (await response.json()) as { content?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر إنشاء الرد.");
      setMessages([...nextMessages, { role: "assistant", content: data.content ?? "" }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function startNewChat() {
    setMessages([]);
    setError("");
    setInput("");
  }

  return (
    <main className="app-shell" dir="rtl">
      <aside className="sidebar" aria-label="الشريط الجانبي">
        <div className="brand-row">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-name">WormAI <span>CHAT</span></span>
        </div>

        <button className="new-chat-button" onClick={startNewChat} type="button" aria-label="محادثة جديدة" title="محادثة جديدة">
          <span className="plus-icon" aria-hidden="true">+</span>
          محادثة جديدة
          <span className="shortcut">⌘ K</span>
        </button>

        <div className="sidebar-section">
          <p className="section-label">مساحة العمل</p>
          <div className="active-thread">
            <span className="thread-icon" aria-hidden="true"><ThreadIcon /></span>
            <span>المحادثة الحالية</span>
            <span className="active-dot" aria-label="نشطة" />
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="connection-card">
            <div className="connection-card-top">
              <span className={`status-indicator status-${connection}`} />
              <span className="connection-title">اتصال Ollama</span>
              <button className="refresh-button" type="button" onClick={checkConnection} disabled={connection === "checking"} aria-label="تحقق من اتصال Ollama">
                <RefreshIcon />
              </button>
            </div>
            <p className="connection-caption">
              {connection === "online" ? "الخادم متصل" : connection === "checking" ? "جارٍ التحقق…" : connection === "offline" ? "الخادم غير متصل" : "تحقق من الخادم المحلي"}
            </p>
            {connection === "online" && (
              <p className="installed-caption">{installedModels.length ? `${installedModels.length} نموذج متاح` : "اتصل الخادم؛ حمّل أحد النماذج أدناه"}</p>
            )}
          </div>
          <div className="privacy-note"><LockIcon /><span>المحادثة تُرسل إلى خادم Ollama الذي تضبطه.</span></div>
        </div>
      </aside>

      <section className="chat-panel" aria-label="المحادثة">
        <header className="topbar">
          <div className="topbar-context">
            <span className="breadcrumb-muted">WormAI</span>
            <span className="breadcrumb-separator">/</span>
            <span>محادثة جديدة</span>
          </div>
          <div className="topbar-actions">
            <label className="model-select-wrap">
              <span className="model-select-label">النموذج</span>
              <select value={model} onChange={(event) => setModel(event.target.value as SafeModelId)} aria-label="اختر النموذج">
                {SAFE_MODELS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <ChevronIcon />
            </label>
            <button className="connect-button" type="button" onClick={checkConnection} disabled={connection === "checking"}>
              <span className={`status-indicator status-${connection}`} />
              {connection === "online" ? "متصل" : connection === "checking" ? "جارٍ الفحص" : connection === "offline" ? "غير متصل" : "فحص الاتصال"}
            </button>
          </div>
        </header>

        <div className={`conversation ${messages.length ? "has-messages" : "is-empty"}`}>
          {messages.length === 0 ? (
            <div className="welcome-content">
              <div className="welcome-symbol"><SparkIcon /></div>
              <p className="welcome-eyebrow">مساحة محادثتك الخاصة</p>
              <h1>أهلًا، كيف أساعدك؟</h1>
              <p className="welcome-description">ابدأ محادثة مع نموذج يعمل على Ollama. اختر نموذجًا من القائمة وأرسل رسالتك.</p>
              <div className="suggestion-grid" aria-label="اقتراحات للبدء">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} className="suggestion-card" type="button" onClick={() => setInput(suggestion)}>
                    <span>{suggestion}</span><span className="suggestion-arrow" aria-hidden="true">↖</span>
                  </button>
                ))}
              </div>
              <details className="setup-details">
                <summary>إعداد Ollama لهذا النموذج</summary>
                <div className="setup-details-content">
                  <span>شغّل الأمر على الجهاز الذي يستضيف Ollama:</span>
                  <code dir="ltr">{selectedModel.command}</code>
                  <p>للنشر، اضبط <bdi dir="ltr">OLLAMA_BASE_URL</bdi> على خادم خاص يمكن للتطبيق الوصول إليه. لا تعرّض منفذ Ollama مباشرة للإنترنت.</p>
                </div>
              </details>
            </div>
          ) : (
            <div className="message-list" aria-live="polite" aria-relevant="additions text">
              {messages.map((message, index) => (
                <article className={`message-row message-${message.role}`} key={`${index}-${message.role}`}>
                  <div className="message-avatar" aria-hidden="true">{message.role === "user" ? "أ" : <span className="mini-mark"><span /></span>}</div>
                  <div className="message-body">
                    <p className="message-author">{message.role === "user" ? "أنت" : "WormAI"}</p>
                    <p className="message-text">{message.content}</p>
                  </div>
                </article>
              ))}
              {loading && <div className="thinking-row" role="status"><span className="thinking-dots"><i /><i /><i /></span><span>يكتب الرد…</span></div>}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="composer-area">
          {error && <div className="error-banner" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="إغلاق التنبيه">×</button></div>}
          {connection === "online" && !installedModels.includes(model) && (
            <div className="model-hint"><span>النموذج غير مثبت بعد.</span><code dir="ltr">{selectedModel.command}</code></div>
          )}
          <form className="composer" onSubmit={sendMessage}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="اكتب رسالتك هنا…"
              aria-label="اكتب رسالتك"
              rows={1}
              maxLength={6000}
              disabled={loading}
            />
            <div className="composer-footer">
              <div className="composer-meta"><span className="model-bullet" />{selectedModel.name}<span className="meta-divider">·</span><span>{input.length}/6000</span></div>
              <button className="send-button" type="submit" disabled={loading || !input.trim()} aria-label="إرسال الرسالة">
                <span>إرسال</span><SendIcon />
              </button>
            </div>
          </form>
          <p className="disclaimer">قد تخطئ النماذج. لا تُدخل معلومات حساسة إلا إذا كنت تثق بخادم Ollama.</p>
        </div>
      </section>
    </main>
  );
}

function ThreadIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 4.5h11a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-4.5 3v-3H4.5A1.5 1.5 0 0 1 3 12V6a1.5 1.5 0 0 1 1.5-1.5Z" /></svg>;
}

function RefreshIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16.2 7.2A6.5 6.5 0 0 0 4.8 5.5L3.5 7M3.5 7V3.8M3.5 7h3.2m-3 5.8a6.5 6.5 0 0 0 11.4 1.7l1.3-1.5m0 0v3.2m0-3.2h-3.2" /></svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 18 18" aria-hidden="true"><rect x="3.5" y="7.5" width="11" height="8" rx="1.5" /><path d="M5.7 7.5V5.3a3.3 3.3 0 0 1 6.6 0v2.2M9 10.5v2" /></svg>;
}

function SparkIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4.5 28.8 19l14.7 5-14.7 4.9L24 43.5l-4.8-14.6L4.5 24l14.7-5L24 4.5Z" /><path d="m39 4 1.8 5.2L46 11l-5.2 1.8L39 18l-1.8-5.2L32 11l5.2-1.8L39 4Z" /></svg>;
}

function ChevronIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 6 3.5 3.5L11.5 6" /></svg>;
}

function SendIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16.8 3.2 9.7 16.8l-1.5-5.1-5-1.6 13.6-6.9Z" /><path d="m8.2 11.7 4.1-4.1" /></svg>;
}
