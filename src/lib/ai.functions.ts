import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MODEL = "google/gemini-3.7-flash";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type GatewayResult = { ok: true; text: string } | { ok: false; message: string };

async function callGateway(messages: { role: string; content: string }[]): Promise<GatewayResult> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { ok: false, message: "المساعد الذكي غير مهيأ حالياً." };

  let res: Response;
  try {
    res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, messages }),
    });
  } catch {
    return { ok: false, message: "تعذّر الاتصال بخدمة الذكاء الاصطناعي." };
  }

  if (res.status === 429) return { ok: false, message: "الطلبات كثيرة، حاول بعد قليل." };
  if (res.status === 402)
    return { ok: false, message: "رصيد الذكاء الاصطناعي غير كافٍ، يرجى شحنه." };
  if (!res.ok) return { ok: false, message: `تعذّر الرد (${res.status}).` };

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) return { ok: false, message: "لم يصل رد من المساعد، حاول مجدداً." };
  return { ok: true, text };
}

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
  .inputValidator((data: unknown) => askSchema.parse(data))
  .handler(async ({ data }) => {
    const result = await callGateway([
      {
        role: "system",
        content:
          "أنت مساعد تدريبي عربي مختص بمحتوى الدورة التالية فقط. أجب بالعربية الفصحى المبسطة وبإيجاز منظم بنقاط عند الحاجة. " +
          "إذا لم تجد الإجابة في المحتوى فوضّح ذلك ثم أعطِ إرشاداً عاماً مفيداً.\n" +
          `عنوان المحتوى: ${data.title}\nمحتوى الدروس:\n${data.context || "(لا يوجد نص مرفق)"}`,
      },
      ...data.history.map((m) => ({ role: m.role, content: m.text })),
      { role: "user", content: data.question },
    ]);
    return result.ok
      ? { ok: true as const, answer: result.text }
      : { ok: false as const, message: result.message };
  });

const genSchema = z.object({
  kind: z.enum(["summary", "ai_context", "description", "quiz"]),
  title: z.string().max(300).default(""),
  source: z.string().max(12000).default(""),
});

/** توليد ملخص/سياق/وصف أو أسئلة اختبار للمدرّب من نص الدرس. */
export const generateLessonContent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => genSchema.parse(data))
  .handler(async ({ data }) => {
    const instructions: Record<string, string> = {
      summary: "اكتب ملخصاً عربياً موجزاً (سطران كحد أقصى) لهذا الدرس.",
      ai_context:
        "استخرج نقاط المعرفة الأساسية من هذا الدرس بصيغة قائمة عربية مختصرة، لتُستخدم كسياق لمساعد ذكي.",
      description: "اكتب وصفاً تسويقياً عربياً واضحاً (٣-٥ أسطر) لهذه الدورة التدريبية.",
      quiz: "أنشئ ٥ أسئلة اختيار من متعدد بالعربية حول هذا الدرس. لكل سؤال: نص السؤال، ثم أربعة خيارات مرقمة، ثم سطر «الإجابة: ...».",
    };

    const result = await callGateway([
      { role: "system", content: "أنت مساعد إعداد محتوى تدريبي عربي دقيق ومختصر." },
      {
        role: "user",
        content: `${instructions[data.kind]}\n\nالعنوان: ${data.title}\nالنص:\n${data.source || "(لا يوجد نص)"}`,
      },
    ]);
    return result.ok
      ? { ok: true as const, text: result.text }
      : { ok: false as const, message: result.message };
  });
