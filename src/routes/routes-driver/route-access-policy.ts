import { createHmac, timingSafeEqual } from 'node:crypto';

export type RouteAccessScope = 'read' | 'simulate';
export type RouteAccessClaims = {
  aud: 'nestjs-route-points';
  routeId: string;
  scope: RouteAccessScope;
  exp: number;
};

// Route-scoped capabilities are temporary. They must be issued only by a
// trusted backend after verifying that the account may access the route.
// There is intentionally NO public HTTP endpoint to issue these credentials.
const MAX_TTL_SECONDS = 15 * 60;
const AUDIENCE = 'nestjs-route-points';
const ROUTE_ID = /^[a-zA-Z0-9_-]{1,128}$/;

export function routeRoom(routeId: string): string {
  if (!ROUTE_ID.test(routeId)) throw new Error('Identificador de rota inválido');
  return `route:${routeId}`;
}

function secretValid(secret: unknown): secret is string {
  return typeof secret === 'string' && Buffer.byteLength(secret, 'utf8') >= 32;
}

function sign(encoded: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(encoded).digest();
}

export function issueRouteAccessToken(
  routeId: string,
  scope: RouteAccessScope,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  ttlSeconds = MAX_TTL_SECONDS,
): string {
  if (!secretValid(secret) || !ROUTE_ID.test(routeId) ||
      (scope !== 'read' && scope !== 'simulate') ||
      !Number.isSafeInteger(nowSeconds) ||
      !Number.isSafeInteger(ttlSeconds) ||
      ttlSeconds < 1 || ttlSeconds > MAX_TTL_SECONDS) {
    throw new Error('Parâmetros de credencial de rota inválidos');
  }
  const claims: RouteAccessClaims = {
    aud: AUDIENCE, routeId, scope, exp: nowSeconds + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded, secret).toString('base64url')}`;
}

export function readRouteAccessToken(
  token: unknown,
  secret: unknown,
  nowSeconds = Math.floor(Date.now() / 1000),
): RouteAccessClaims | null {
  if (!secretValid(secret) || typeof token !== 'string' ||
      token.length > 2048 || !Number.isSafeInteger(nowSeconds)) return null;

  const parts = token.split('.');
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) {
    return null;
  }
  try {
    const expected = sign(parts[0], secret);
    const received = Buffer.from(parts[1], 'base64url');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return null;
    }
    const claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (!claims || claims.aud !== AUDIENCE ||
        typeof claims.routeId !== 'string' || !ROUTE_ID.test(claims.routeId) ||
        (claims.scope !== 'read' && claims.scope !== 'simulate') ||
        !Number.isSafeInteger(claims.exp) ||
        claims.exp <= nowSeconds || claims.exp - nowSeconds > MAX_TTL_SECONDS) {
      return null;
    }
    return {
      aud: AUDIENCE, routeId: claims.routeId,
      scope: claims.scope, exp: claims.exp,
    };
  } catch {
    return null;
  }
}
