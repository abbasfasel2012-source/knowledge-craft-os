import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Google Gemini API ────────────────────────────────────────────────────────
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type GeminiResult = { ok: true; text: string } | { ok: false; message: string };

interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

async function callGemini(
  messages: { role: string; content: string }[],
  systemPrompt?: string,
): Promise<GeminiResult> {
  const apiKey =
    process.env["GEMINI_API_KEY"] ||
    process.env["VITE_GEMINI_API_KEY"] ||
    "";
  if (!apiKey) return { ok: false, message: "مفتاح Gemini غير مضبوط. أضف GEMINI_API_KEY في إعدادات Lovable → Secrets." };

  const contents: GeminiContent[] = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // دمج الرسائل المتكررة لنفس الدور
  const normalizedContents: GeminiContent[] = [];
  for (const msg of contents) {
    const last = normalizedContents[normalizedContents.length - 1];
    if (last && last.role === msg.role) {
      last.parts[0].text += "\n" + msg.parts[0].text;
    } else {
      normalizedContents.push({ ...msg, parts: [...msg.parts] });
    }
  }
  if (normalizedContents.length === 0 || normalizedContents[0].role !== "user") {
    return { ok: false, message: "خطأ داخلي في بناء الطلب." };
  }

  const body: Record<string, unknown> = { contents: normalizedContents };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  let res: Response;
  try {
    res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: "تعذّر الاتصال بخدمة Gemini." };
  }

  if (res.status === 429) return { ok: false, message: "الطلبات كثيرة، انتظر قليلاً ثم أعد المحاولة." };
  if (res.status === 403) return { ok: false, message: "مفتاح Gemini غير صالح أو انتهت صلاحيته." };
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const errMsg = (() => { try { return JSON.parse(errText)?.error?.message; } catch { return null; } })();
    return { ok: false, message: errMsg || `خطأ من Gemini (${res.status}).` };
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };

  if (json.error?.message) return { ok: false, message: json.error.message };

  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) return { ok: false, message: "لم يصل رد من المساعد، حاول مجدداً." };
  return { ok: true, text };
}

// ─── مساعد الدرس ──────────────────────────────────────────────────────────────
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
      "أنت مساعد تدريبي عربي مختص بمحتوى الدورة التالية فقط. " +
      "أجب بالعربية الفصحى المبسطة وبإيجاز منظم بنقاط عند الحاجة. " +
      "إذا لم تجد الإجابة في المحتوى فوضّح ذلك ثم أعطِ إرشاداً عاماً مفيداً.\n" +
      `عنوان المحتوى: ${data.title}\nمحتوى الدروس:\n${data.context || "(لا يوجد نص مرفق)"}`;

    const messages = [
      ...data.history.map((m) => ({ role: m.role, content: m.text })),
      { role: "user", content: data.question },
    ];

    const result = await callGemini(messages, systemPrompt);

    return result.ok
      ? { ok: true as const, answer: result.text }
      : { ok: false as const, message: result.message };
  });

// ─── توليد محتوى للمدرّب ─────────────────────────────────────────────────────
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
        "استخرج نقاط المعرفة الأساسية من هذا الدرس بصيغة قائمة عربية مختصرة، " +
        "لتُستخدم كسياق لمساعد ذكي يجيب على أسئلة الطلاب.",
      description: "اكتب وصفاً تسويقياً عربياً واضحاً (٣-٥ أسطر) لهذه الدورة التدريبية.",
      quiz:
        "أنشئ ٥ أسئلة اختيار من متعدد بالعربية حول هذا الدرس. " +
        "لكل سؤال: نص السؤال، ثم أربعة خيارات مرقمة (أ ب ج د)، ثم سطر «الإجابة: ...».",
    };

    const result = await callGemini(
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

// ─── تصحيح الإجابات المقالية والقصيرة بالذكاء الاصطناعي ──────────────────────
const gradeSchema = z.object({
  question: z.string().max(2000),
  correctAnswer: z.string().max(4000),
  studentAnswer: z.string().max(4000),
  maxPoints: z.number().int().min(1).max(100),
  extraContext: z.string().max(2000).default(""),
});

export const gradeEssayAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => gradeSchema.parse(data))
  .handler(async ({ data }) => {
    const prompt =
      `أنت مصحح اختبارات متخصص. قارن إجابة الطالب بالإجابة النموذجية وقيّمها بموضوعية وعدالة.\n\n` +
      `السؤال: ${data.question}\n` +
      `الإجابة النموذجية: ${data.correctAnswer}\n` +
      (data.extraContext ? `سياق إضافي: ${data.extraContext}\n` : "") +
      `إجابة الطالب: ${data.studentAnswer}\n\n` +
      `الدرجة الكاملة للسؤال: ${data.maxPoints}\n\n` +
      `استجب بصيغة JSON فقط دون أي نص آخر:\n` +
      `{"score": <رقم من 0 إلى ${data.maxPoints}>, "feedback": "<تعليق مختصر جملة أو جملتان بالعربية>"}`;

    const result = await callGemini(
      [{ role: "user", content: prompt }],
      "أنت مصحح اختبارات دقيق ومنصف. استجب بـ JSON فقط.",
    );

    if (!result.ok) return { ok: false as const, message: result.message };

    try {
      const cleaned = result.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as { score: number; feedback: string };
      const score = Math.min(data.maxPoints, Math.max(0, Math.round(Number(parsed.score))));
      return { ok: true as const, score, feedback: String(parsed.feedback || "") };
    } catch {
      return { ok: false as const, message: "تعذّر تحليل نتيجة التصحيح الذكي." };
    }
  });

// ─── توليد نص تلقائي من محتوى الدرس (نسخة نصية تقريبية) ─────────────────────
const transcriptSchema = z.object({
  title: z.string().max(300),
  content: z.string().max(8000).default(""),
  aiContext: z.string().max(3000).default(""),
  summary: z.string().max(1000).default(""),
});

export const generateTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => transcriptSchema.parse(data))
  .handler(async ({ data }) => {
    const sourceText = [
      data.summary && `الملخص: ${data.summary}`,
      data.content && `المحتوى: ${data.content}`,
      data.aiContext && `السياق: ${data.aiContext}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const prompt =
      `بناءً على المعلومات التالية عن درس بعنوان "${data.title}"، ` +
      `أنشئ نصاً تقريبياً شاملاً يمثّل ما يمكن أن يُقال في هذا الدرس بأسلوب تعليمي. ` +
      `اجعله طبيعياً كأنه نص إلقاء فعلي باللغة العربية الفصحى المبسطة.\n\n` +
      (sourceText || "(لا توجد معلومات متاحة، أنشئ نصاً تعليمياً عاماً حول عنوان الدرس)");

    const result = await callGemini(
      [{ role: "user", content: prompt }],
      "أنت كاتب محتوى تعليمي محترف باللغة العربية.",
    );

    return result.ok
      ? { ok: true as const, text: result.text }
      : { ok: false as const, message: result.message };
  });
