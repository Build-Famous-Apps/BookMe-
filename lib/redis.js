// Shared Upstash Redis helper — REST API via fetch, no npm dependencies.
// Used by all /api functions.

async function redis(cmd) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    const e = new Error(
      'Server is missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. ' +
      'If you added Upstash through Vercel Storage these are created automatically — ' +
      'check Vercel -> Project Settings -> Environment Variables, then redeploy with `vercel --prod`.'
    );
    e.statusHint = 500;
    throw e;
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!resp.ok) {
    const t = await resp.text();
    const e = new Error(`Database returned ${resp.status}: ${t.slice(0, 200)}`);
    e.statusHint = 502;
    throw e;
  }
  const data = await resp.json();
  return data.result;
}

async function getJson(key) {
  const raw = await redis(['GET', key]);
  if (raw === null || raw === undefined) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function setJson(key, val) {
  return redis(['SET', key, JSON.stringify(val)]);
}

module.exports = { redis, getJson, setJson };
