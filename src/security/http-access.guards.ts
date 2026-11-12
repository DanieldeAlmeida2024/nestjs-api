import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readRouteAccessToken } from '../routes/routes-driver/route-access-policy';

// Service-only token, deliberately distinct from ROUTES_WS_TOKEN_SECRET.
// This is not user identity, tenant membership, or a substitute for RBAC.
export function validInternalApiAuthorization(header: unknown, secret: unknown): boolean {
  if (typeof secret !== 'string' ||
      Buffer.byteLength(secret, 'utf8') < 32 ||
      /\s/.test(secret) ||
      typeof header !== 'string') return false;
  const match = /^Bearer ([^\s]+)$/.exec(header);
  if (!match) return false;
  const expected = createHash('sha256').update(secret, 'utf8').digest();
  const provided = createHash('sha256').update(match[1], 'utf8').digest();
  return timingSafeEqual(expected, provided);
}

type HttpRequest = {
  headers?: { authorization?: unknown };
  params?: { id?: unknown };
};

@Injectable()
export class InternalServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<HttpRequest>();
    if (!validInternalApiAuthorization(
      req?.headers?.authorization, process.env.ROUTES_INTERNAL_API_TOKEN,
    )) {
      throw new UnauthorizedException('Acesso reservado ao serviço interno');
    }
    return true;
  }
}

@Injectable()
export class RouteReadGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<HttpRequest>();
    const header = req?.headers?.authorization;
    const match = typeof header === 'string' ? /^Bearer ([^\s]+)$/.exec(header) : null;
    const claims = readRouteAccessToken(match?.[1], process.env.ROUTES_WS_TOKEN_SECRET);
    if (!claims || typeof req?.params?.id !== 'string' ||
        claims.routeId !== req.params.id ||
        (claims.scope !== 'read' && claims.scope !== 'simulate')) {
      throw new UnauthorizedException('Credencial de leitura inválida para esta rota');
    }
    return true;
  }
}
