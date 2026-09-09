import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_courses",
  title: "List courses",
  description: "List published training courses, optionally filtered by a search term.",
  inputSchema: {
    search: z.string().trim().optional().describe("Optional text to match in course titles."),
    limit: z.number().int().optional().describe("Maximum number of courses to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("courses")
      .select("id, title, slug, summary, level, is_free, price, duration_minutes, status")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 20, 1), 50));
    if (search) query = query.ilike("title", `%${search}%`);
    const { data, error } = await query;
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : {
          content: [{ type: "text", text: JSON.stringify(data ?? []) }],
          structuredContent: { courses: data ?? [] },
        };
  },
});
