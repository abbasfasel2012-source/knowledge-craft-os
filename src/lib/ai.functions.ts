import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── إعداد موفّر الذكاء الاصطناعي ───────────────────────────────────────────
// يدعم Anthropic API أو Lovable Gateway حسب المتغيرات المتاحة
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const LOVABLE_MODEL = "google/gemini-3.7-flash";

type GatewayResult = { ok: true; text: string } | { ok: false; message: string };

async function callAI(
  messages: { role: string; content: string }[],
  systemPrompt?: string,
): Promise<GatewayResult> {
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];
  const lovableKey = process.env["LOVABLE_API_KEY"];

  // ── Anthropic API ─────────────────────────────────────────────────────────
  if (anthropicKey) {
    let res: Response;
    try {
      const body: Record<string, unknown> = {
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      };
      if (systemPrompt) body.system = systemPrompt;

      res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });
    } catch {
      return { ok: false, message: "تعذّر الاتصال بخدمة الذكاء الاصطناعي." };
    }

    if (res.status === 429) return { ok: false, message: "الطلبات كثيرة، حاول بعد قليل." };
    if (res.status === 402) return { ok: false, message: "رصيد الذكاء الاصطناعي غير كافٍ." };
    if (!res.ok) return { ok: false, message: `تعذّر الرد (${res.status}).` };

    const json = (await res.json()) as { content?: { type: string; text: string }[] };
    const text = json.content?.find((b) => b.type === "text")?.text ?? "";
    if (!text.trim()) return { ok: false, message: "لم يصل رد من المساعد، حاول مجدداً." };
    return { ok: true, text };
  }

  // ── Lovable Gateway (احتياطي) ─────────────────────────────────────────────
  if (lovableKey) {
    const allMessages = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    let res: Response;
    try {
      res = await fetch(LOVABLE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
        body: JSON.stringify({ model: LOVABLE_MODEL, messages: allMessages }),
      });
    } catch {
      return { ok: false, message: "تعذّر الاتصال بخدمة الذكاء الاصطناعي." };
    }

    if (res.status === 429) return { ok: false, message: "الطلبات كثيرة، حاول بعد قليل." };
    if (res.status === 402) return { ok: false, message: "رصيد الذكاء الاصطناعي غير كافٍ." };
    if (!res.ok) return { ok: false, message: `تعذّر الرد (${res.status}).` };

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) return { ok: false, message: "لم يصل رد من المساعد، حاول مجدداً." };
    return { ok: true, text };
  }

  return {
    ok: false,
    message:
      "المساعد الذكي غير مهيأ. أضف ANTHROPIC_API_KEY أو LOVABLE_API_KEY في إعدادات البيئة.",
  };
}

// ─── سؤال مساعد الدرس ────────────────────────────────────────────────────────
const askSchema = z.object({
  question: z.string().min(1).max(2000),
  context: z.string().max(12000).default(""),
  title: z.string().max(300).default(""),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) }))
    .max(10)
    .default([]),
});

export const askLessonAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => askSchema.parse(data))
  .handler(async ({ data }) => {
    const systemPrompt =
      "أنت مساعد تدريبي عربي مختص بمحتوى الدورة التالية فقط. أجب بالعربية الفصحى المبسطة وبإيجاز منظم بنقاط عند الحاجة. " +
      "إذا لم تجد الإجابة في المحتوى فوضّح ذلك ثم أعطِ إرشاداً عاماً مفيداً.\n" +
      `عنوان المحتوى: ${data.title}\nمحتوى الدروس:\n${data.context || "(لا يوجد نص مرفق)"}`;

    const result = await callAI(
      [
        ...data.history.map((m) => ({ role: m.role, content: m.text })),
        { role: "user", content: data.question },
      ],
      systemPrompt,
    );

    return result.ok
      ? { ok: true as const, answer: result.text }
      : { ok: false as const, message: result.message };
  });

// ─── توليد محتوى المدرّب ──────────────────────────────────────────────────────
const genSchema = z.object({
  kind: z.enum(["summary", "ai_context", "description", "quiz"]),
  title: z.string().max(300).default(""),
  source: z.string().max(12000).default(""),
});

export const generateLessonContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => genSchema.parse(data))
  .handler(async ({ data }) => {
    const instructions: Record<string, string> = {
      summary: "اكتب ملخصاً عربياً موجزاً (سطران كحد أقصى) لهذا الدرس.",
      ai_context:
        "استخرج نقاط المعرفة الأساسية من هذا الدرس بصيغة قائمة عربية مختصرة، لتُستخدم كسياق لمساعد ذكي.",
      description: "اكتب وصفاً تسويقياً عربياً واضحاً (٣-٥ أسطر) لهذه الدورة التدريبية.",
      quiz: "أنشئ ٥ أسئلة اختيار من متعدد بالعربية حول هذا الدرس. لكل سؤال: نص السؤال، ثم أربعة خيارات مرقمة، ثم سطر «الإجابة: ...».",
    };

    const result = await callAI(
      [
        {
          role: "user",
          content: `${instructions[data.kind]}\n\nالعنوان: ${data.title}\nالنص:\n${data.source || "(لا يوجد نص)"}`,
        },
      ],
      "أنت مساعد إعداد محتوى تدريبي عربي دقيق ومختصر.",
    );

    return result.ok
      ? { ok: true as const, text: result.text }
      : { ok: false as const, message: result.message };
  });
