import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  question: z.string().min(1).max(2000),
  context: z.string().max(8000).default(""),
  title: z.string().max(300).default(""),
});

export const askLessonAI = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, message: "المساعد الذكي غير مهيأ حالياً." };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "system",
            content:
              "أنت مساعد تدريبي عربي مختص بالدرس التالي فقط. أجب بالعربية الفصحى المبسطة وبإيجاز منظم. " +
              `عنوان الدرس: ${data.title}\nمحتوى الدرس ونصه:\n${data.context}`,
          },
          { role: "user", content: data.question },
        ],
      }),
    });

    if (res.status === 429) return { ok: false as const, message: "الطلبات كثيرة، حاول بعد قليل." };
    if (res.status === 402)
      return { ok: false as const, message: "رصيد الذكاء الاصطناعي غير كافٍ، يرجى شحنه." };
    if (!res.ok) return { ok: false as const, message: `تعذّر الرد (${res.status}).` };

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { ok: true as const, answer: json.choices?.[0]?.message?.content ?? "" };
  });
