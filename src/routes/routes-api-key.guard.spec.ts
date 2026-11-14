import { ExecutionContext, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { RoutesApiKeyGuard } from './routes-api-key.guard';

describe('RoutesApiKeyGuard', () => {
  const segredo = 'chave_de_teste_com_mais_de_32_caracteres_e_sem_uso_real';
  const original = process.env.ROUTES_API_KEY;
  const guard = new RoutesApiKeyGuard();

  const contexto = (chave?: string) => ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: { 'x-routes-api-key': chave } }),
    }),
  }) as unknown as ExecutionContext;

  afterEach(() => {
    if (original === undefined) delete process.env.ROUTES_API_KEY;
    else process.env.ROUTES_API_KEY = original;
  });

  it('bloqueia todas as rotas se chave não estiver configurada', () => {
    delete process.env.ROUTES_API_KEY;
    expect(() => guard.canActivate(contexto())).toThrow(ServiceUnavailableException);
  });

  it('recusa configuração fraca e não aceita chave vazia', () => {
    process.env.ROUTES_API_KEY = '123';
    expect(() => guard.canActivate(contexto('123'))).toThrow(ServiceUnavailableException);
  });

  it('nega requisições sem chave ou com chave errada', () => {
    process.env.ROUTES_API_KEY = segredo;
    expect(() => guard.canActivate(contexto())).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contexto('x'.repeat(48)))).toThrow(UnauthorizedException);
  });

  it('autoriza apenas a chave exata', () => {
    process.env.ROUTES_API_KEY = segredo;
    expect(guard.canActivate(contexto(segredo))).toBe(true);
  });
});
