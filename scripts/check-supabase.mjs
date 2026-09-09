import fs from "node:fs";
import https from "node:https";

const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter(Boolean).map((line) => {
  const i = line.indexOf("=");
  return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, "")];
}));
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) { console.log(JSON.stringify({ configured: false, reason: "missing env" })); process.exit(0); }
const tables = ["courses", "lessons", "quizzes", "questions", "user_roles", "enrollments"];
function request(table) {
  return new Promise((resolve) => {
    const u = new URL(`/rest/v1/${table}?select=*&limit=1`, url);
    const req = https.request(u, { headers: { apikey: key, Authorization: `Bearer ${key}` } }, (res) => {
      let body = "";
      res.on("data", (c) => body += c);
      res.on("end", () => resolve({ table, status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, error: res.statusCode >= 300 ? body.slice(0, 240) : undefined }));
    });
    req.on("error", (e) => resolve({ table, status: 0, ok: false, error: e.message }));
    req.end();
  });
}
const results = await Promise.all(tables.map(request));
console.log(JSON.stringify({ configured: true, host: new URL(url).host, results }, null, 2));
