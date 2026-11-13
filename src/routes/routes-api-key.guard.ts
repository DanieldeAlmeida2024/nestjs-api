import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Bloqueio inicial das rotas de controle: credencial somente servidor-servidor.
 * Não substitui identidade do operador nem ACL por rota/proprietário.
 */
@Injectable()
export class RoutesApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const segredo = process.env.ROUTES_API_KEY;
    if (!segredo || segredo.length < 32) {
      throw new ServiceUnavailableException(
        'Operações de rotas indisponíveis sem credencial de servidor configurada',
      );
    }

    const fornecido = context.switchToHttp().getRequest().headers['x-routes-api-key'];
    if (typeof fornecido !== 'string' || fornecido.length < 32) {
      throw new UnauthorizedException('Credencial de rota ausente ou inválida');
    }

    // Comparar digests de tamanho fixo evita comparações de strings com tempo variável.
    const esperadoHash = createHash('sha256').update(segredo).digest();
    const recebidoHash = createHash('sha256').update(fornecido).digest();
    if (!timingSafeEqual(esperadoHash, recebidoHash)) {
      throw new UnauthorizedException('Credencial de rota ausente ou inválida');
    }
    return true;
  }
}
