const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

function parseCorsOrigins() {
  const fromEnv = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ORIGINS, ...fromEnv])];
}

function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/\.vercel\.app$/i.test(origin)) return true;
  if (/\.onrender\.com$/i.test(origin)) return true;
  return false;
}

module.exports = { parseCorsOrigins, isOriginAllowed };
