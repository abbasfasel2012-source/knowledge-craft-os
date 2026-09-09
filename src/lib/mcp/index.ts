import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCoursesTool from "./tools/list-courses";
import getCourseTool from "./tools/get-course";
import myEnrollmentsTool from "./tools/my-enrollments";
import enrollInCourseTool from "./tools/enroll-in-course";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "learnflow-hub",
  title: "LearnFlow Hub",
  version: "0.1.0",
  instructions:
    "Tools for the LearnFlow Hub Arabic training platform. Browse published courses, inspect a course and its lessons, review the signed-in user's enrollments and progress, and enroll them in a course.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCoursesTool, getCourseTool, myEnrollmentsTool, enrollInCourseTool],
});
