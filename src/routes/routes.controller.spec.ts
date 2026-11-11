import { UnauthorizedException } from '@nestjs/common';
import { RoutesController } from './routes.controller';
import { issueRouteAccessToken } from './routes-driver/route-access-policy';

const SECRET = 'unit-test-access-key-longer-than-32-bytes-for-routes';
const ROUTE = '507f1f77bcf86cd799439011';
const OTHER = '507f1f77bcf86cd799439012';

describe('RoutesController — proteção do endpoint de pontos', () => {
  const routesService = {} as any;
  const driverService = { processRoute: jest.fn() };
  const controller = new RoutesController(routesService, driverService as any);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ROUTES_WS_TOKEN_SECRET = SECRET;
    driverService.processRoute.mockResolvedValue({ route_id: ROUTE });
  });
  afterEach(() => { delete process.env.ROUTES_WS_TOKEN_SECRET; });

  it('NEST-HTTP01 token ausente falha fechado sem tocar no banco', () => {
    expect(() => controller.processRoute(ROUTE, { lat: 1, lng: 2 }))
      .toThrow(UnauthorizedException);
    expect(driverService.processRoute).not.toHaveBeenCalled();
  });

  it('NEST-HTTP02 escopo read não autoriza publicar localização', () => {
    const read = issueRouteAccessToken(ROUTE, 'read', SECRET);
    expect(() => controller.processRoute(ROUTE, { lat: 1, lng: 2 }, `Bearer ${read}`))
      .toThrow(UnauthorizedException);
    expect(driverService.processRoute).not.toHaveBeenCalled();
  });

  it('NEST-HTTP03 token simulate não pode modificar outra rota', () => {
    const simulate = issueRouteAccessToken(ROUTE, 'simulate', SECRET);
    expect(() => controller.processRoute(OTHER, { lat: 1, lng: 2 }, `Bearer ${simulate}`))
      .toThrow(UnauthorizedException);
    expect(driverService.processRoute).not.toHaveBeenCalled();
  });

  it('NEST-HTTP04 token expirado é negado', () => {
    const expired = issueRouteAccessToken(ROUTE, 'simulate', SECRET,
      Math.floor(Date.now() / 1000) - 100, 10);
    expect(() => controller.processRoute(ROUTE, { lat: 1, lng: 2 }, `Bearer ${expired}`))
      .toThrow(UnauthorizedException);
  });

  it('NEST-HTTP05 token simulate da rota é aceito', async () => {
    const simulate = issueRouteAccessToken(ROUTE, 'simulate', SECRET);
    await expect(controller.processRoute(ROUTE,
      { lat: -16.6, lng: -49.2 }, `Bearer ${simulate}`))
      .resolves.toEqual({ route_id: ROUTE });
    expect(driverService.processRoute).toHaveBeenCalledWith({
      route_id: ROUTE, lat: -16.6, lng: -49.2,
    });
  });

  it('NEST-HTTP06 sem configuração secreta nega inclusive token assinado', () => {
    const simulate = issueRouteAccessToken(ROUTE, 'simulate', SECRET);
    delete process.env.ROUTES_WS_TOKEN_SECRET;
    expect(() => controller.processRoute(ROUTE, { lat: 1, lng: 2 }, `Bearer ${simulate}`))
      .toThrow(UnauthorizedException);
    expect(driverService.processRoute).not.toHaveBeenCalled();
  });
});
