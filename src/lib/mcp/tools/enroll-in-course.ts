import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "enroll_in_course",
  title: "Enroll in a course",
  description: "Enroll the signed-in user in a published course, identified by its slug.",
  inputSchema: { slug: z.string().trim().describe("Slug of the course to enroll in.") },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (courseError)
      return { content: [{ type: "text", text: courseError.message }], isError: true };
    if (!course)
      return { content: [{ type: "text", text: "Published course not found" }], isError: true };

    const userId = ctx.getUserId();
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id, progress")
      .eq("course_id", course.id)
      .eq("user_id", userId!)
      .maybeSingle();
    if (existing)
      return {
        content: [{ type: "text", text: `Already enrolled in ${course.title}.` }],
        structuredContent: { enrollment: existing, alreadyEnrolled: true },
      };

    const { data, error } = await supabase
      .from("enrollments")
      .insert({ course_id: course.id, user_id: userId! })
      .select("id, progress")
      .maybeSingle();
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : {
          content: [{ type: "text", text: `Enrolled in ${course.title}.` }],
          structuredContent: { enrollment: data, alreadyEnrolled: false },
        };
  },
});
