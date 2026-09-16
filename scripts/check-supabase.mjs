import fs from "node:fs";

function loadDotEnv() {
  try {
    return Object.fromEntries(
      fs.readFileSync(".env", "utf8")
        .split(/\r?\n/)
        .filter((line) => line.trim() && !line.trim().startsWith("#"))
        .map((line) => {
          const i = line.indexOf("=");
          return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
        }),
    );
  } catch {
    return {};
  }
}

const env = { ...loadDotEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const tables = ["profiles", "courses", "lessons", "quizzes", "questions", "user_roles", "enrollments", "certificates", "reviews", "quiz_attempts"];

if (!url || !key) {
  console.error(JSON.stringify({ configured: false, reason: "missing SUPABASE_URL or public key" }, null, 2));
  process.exit(1);
}

async function request(path, requestKey = key) {
  try {
    const response = await fetch(new URL(path, url), {
      headers: { apikey: requestKey, Authorization: `Bearer ${requestKey}` },
    });
    const body = await response.text();
    return { status: response.status, ok: response.ok, error: response.ok ? undefined : body.slice(0, 240) };
  } catch (error) {
    return { status: 0, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

const settingsResponse = await request("/auth/v1/settings");
const publicTables = await Promise.all(tables.map(async (table) => ({ table, ...(await request(`/rest/v1/${table}?select=*&limit=1`)) })));
const result = {
  configured: true,
  host: new URL(url).host,
  auth: { reachable: settingsResponse.ok, googleEnabled: undefined, error: settingsResponse.error },
  publicKeyTables: publicTables,
};

if (settingsResponse.ok) {
  const settings = await (await fetch(new URL("/auth/v1/settings", url), { headers: { apikey: key, Authorization: `Bearer ${key}` } })).json();
  result.auth.googleEnabled = Boolean(settings?.external?.google);
}

if (serviceKey) {
  result.serviceRoleTables = await Promise.all(tables.map(async (table) => ({ table, ...(await request(`/rest/v1/${table}?select=*&limit=1`, serviceKey)) })));
}

console.log(JSON.stringify(result, null, 2));
const serviceFailures = (result.serviceRoleTables || []).filter(({ ok }) => !ok);
if (!result.auth.reachable || serviceFailures.length > 0) process.exitCode = 1;
