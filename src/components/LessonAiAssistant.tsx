import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { askLessonAI } from "@/lib/ai.functions";

interface LessonLike {
  title: string;
  content?: string | null;
  attachment_url?: string | null;
  pdf_url?: string | null;
  script_text?: string | null;
  ai_context?: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  isError?: boolean;
}

async function fetchTextAttachment(url?: string | null): Promise<string> {
  if (!url) return "";
  const isTxt = /\.txt(\?|$)/i.test(url);
  if (!isTxt) return "";
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    return (await res.text()).slice(0, 6000);
  } catch {
    return "";
  }
}

export function LessonAiAssistant({
  lessons,
  courseTitle,
}: {
  lessons: LessonLike[];
  courseTitle?: string;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiReady, setAiReady] = useState<boolean | null>(null); // null = لم يُجرَّب بعد
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const buildContext = async () => {
    const attachmentTexts = await Promise.all(
      lessons.map((l) => fetchTextAttachment(l.attachment_url || l.pdf_url)),
    );
    return lessons
      .map((l, i) => {
        const parts = [
          l.content,
          l.script_text,
          l.ai_context,
          attachmentTexts[i] ? `محتوى المرفق:\n${attachmentTexts[i]}` : "",
        ].filter(Boolean);
        return parts.length ? `درس: ${l.title}\n${parts.join("\n")}` : "";
      })
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 8000);
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setIsLoading(true);

    try {
      const context = await buildContext();
      const title = [courseTitle, ...lessons.map((l) => l.title)].filter(Boolean).join("، ");
      const result = await askLessonAI({
        data: { question: q, context, title, history: messages.slice(-10) },
      });

      if (result.ok) {
        setAiReady(true);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: result.answer || "لم أجد إجابة واضحة." },
        ]);
      } else {
        setAiReady(false);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: result.message, isError: true },
        ]);
      }
    } catch {
      setAiReady(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "حدث خطأ أثناء الاتصال بالمساعد. تحقق من إعدادات GEMINI_API_KEY في Lovable.", isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setAiReady(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <h3 className="font-bold">مساعد الدورة الذكي</h3>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3 w-3" /> محادثة جديدة
          </button>
        )}
      </div>

      {aiReady === false && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">المساعد الذكي غير متاح حالياً</p>
            <p className="mt-1 text-muted-foreground">
              تأكد من إضافة <code className="rounded bg-destructive/10 px-1">GEMINI_API_KEY</code> في إعدادات
              Lovable → Secrets. يمكنك الحصول على مفتاح مجاني من{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Google AI Studio
              </a>
              .
            </p>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-border bg-card p-3"
      >
        {messages.length === 0 && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-gold" />
              <span>اطرح سؤالك حول هذا الدرس وسأحاول مساعدتك.</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                "ما أهم النقاط في هذا الدرس؟",
                "اشرح لي هذا المفهوم بشكل أبسط",
                "ما الفرق بين...",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuestion(suggestion)}
                  className="rounded-full border border-gold/30 bg-gold/5 px-2.5 py-1 text-xs text-foreground hover:bg-gold/10"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg p-2.5 text-sm ${
              m.role === "user"
                ? "bg-gold/10 text-foreground"
                : m.isError
                  ? "border border-destructive/20 bg-destructive/5 text-destructive"
                  : "bg-background/60 text-foreground"
            }`}
          >
            {m.role === "assistant" && !m.isError ? (
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pr-5">{children}</ul>,
                  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pr-5">{children}</ol>,
                  li: ({ children }) => <li>{children}</li>,
                  code: ({ children }) => (
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>
                  ),
                }}
              >
                {m.text}
              </ReactMarkdown>
            ) : (
              m.text
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> يفكر المساعد...
          </div>
        )}
      </div>

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="اكتب سؤالك عن الدرس..."
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="rounded-lg gold-gradient px-3 py-2 text-gold-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
