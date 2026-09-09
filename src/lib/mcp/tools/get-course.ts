import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_course",
  title: "Get course details",
  description: "Get one course by its slug, including the lessons the signed-in user can see.",
  inputSchema: { slug: z.string().trim().describe("Course slug, e.g. 'intro-to-safety'.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: course, error } = await supabase
      .from("courses")
      .select("id, title, slug, summary, description, level, is_free, price, duration_minutes, tags")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!course) return { content: [{ type: "text", text: "Course not found" }], isError: true };

    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, title, position, type, duration_minutes, is_preview, summary")
      .eq("course_id", course.id)
      .order("position", { ascending: true });

    const payload = { course, lessons: lessons ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
