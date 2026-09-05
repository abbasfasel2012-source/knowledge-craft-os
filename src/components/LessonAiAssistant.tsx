import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { askLessonAI } from "@/lib/ai.functions";

interface LessonLike {
  title: string;
  content?: string | null;
  attachment_url?: string | null;
  pdf_url?: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

// نجلب فقط المرفقات النصية (txt) تلقائياً كسياق إضافي للمساعد.
// ملفات PDF والصوت (mp3) تحتاج خط معالجة منفصل (استخراج/تفريغ) — قيد التطوير.
async function fetchTextAttachment(url?: string | null): Promise<string> {
  if (!url) return "";
  const isTxt = /\.txt(\?|$)/i.test(url);
  if (!isTxt) return "";
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const text = await res.text();
    return text.slice(0, 6000);
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const hasPdfOrAudio = lessons.some((l) =>
    (l.pdf_url || l.attachment_url || "").match(/\.(pdf|mp3)(\?|$)/i),
  );

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setIsLoading(true);

    try {
      const attachmentTexts = await Promise.all(
        lessons.map((l) => fetchTextAttachment(l.attachment_url || l.pdf_url)),
      );
      const context = lessons
        .map((l, i) => {
          const parts = [l.content || ""].filter(Boolean);
          if (attachmentTexts[i]) parts.push(`محتوى المرفق:\n${attachmentTexts[i]}`);
          return parts.length ? `درس: ${l.title}\n${parts.join("\n")}` : "";
        })
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 8000);

      const title = [courseTitle, ...lessons.map((l) => l.title)].filter(Boolean).join("، ");
      const result = await askLessonAI({
        data: { question: q, context, title, history: messages.slice(-10) },
      });

      if (result.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: result.answer || "لم أجد إجابة واضحة." },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: result.message }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "حدث خطأ أثناء الاتصال بالمساعد. حاول مرة أخرى." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold" />
        <h3 className="font-bold">اسأل مساعد الدورة الذكي</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        يجيب المساعد بالاعتماد على محتوى الدرس النصي ومرفقاته. يمكنك سؤاله عن أي نقطة لم تفهمها.
        {hasPdfOrAudio &&
          " تحليل ملفات PDF والصوت (mp3) قيد التطوير حالياً — الإجابات تعتمد الآن على النص المتاح فقط."}
      </p>

      <div
        ref={scrollRef}
        className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-border bg-card p-3"
      >
        {messages.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot className="h-4 w-4 text-gold" />
            اطرح سؤالك حول هذا الدرس وسأحاول مساعدتك.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg p-2.5 text-sm ${
              m.role === "user" ? "bg-gold/10 text-foreground" : "bg-background/60 text-foreground"
            }`}
          >
            {m.role === "assistant" ? (
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
