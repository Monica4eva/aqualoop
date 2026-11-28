import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';

function parseAllowedOrigins(raw?: string): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  );
}

export const corsMiddleware: MiddlewareHandler = async (c, next) => {
  const originHeader = c.req.header('Origin');
  if (!originHeader) {
    return next();
  }

  const allowedOrigins = parseAllowedOrigins(c.env?.ALLOWED_ORIGINS);

  const handler = cors({
    origin: (origin) => (allowedOrigins.has(origin) ? origin : ''),
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });

  return handler(c, next);
};