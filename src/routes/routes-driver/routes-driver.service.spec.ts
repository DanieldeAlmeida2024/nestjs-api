import { RoutesDriverService } from './routes-driver.service';

describe('RoutesDriverService — persistência e emissão de pontos', () => {
  const prisma = { routeDriver: { upsert: jest.fn() } };
  const gateway = { emitNewPoints: jest.fn() };
  const service = new RoutesDriverService(prisma as any, gateway as any);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.routeDriver.upsert.mockResolvedValue({ route_id: 'route-a', points: [] });
  });

  it('NEST-T06 salva ponto e envia exatamente o mesmo payload ao WebSocket', async () => {
    const point = { route_id: 'route-a', lat: -16.6, lng: -49.2 };
    const result = await service.processRoute(point);
    expect(result.route_id).toBe('route-a');
    expect(prisma.routeDriver.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { route_id: 'route-a' },
        create: {
          route_id: 'route-a',
          points: { set: { location: { lat: -16.6, lng: -49.2 } } },
        },
        update: { points: { push: { location: { lat: -16.6, lng: -49.2 } } } },
      }),
    );
    expect(gateway.emitNewPoints).toHaveBeenCalledWith(point);
  });

  it('NEST-T06 falha na persistência não deve emitir ponto fictício', async () => {
    prisma.routeDriver.upsert.mockRejectedValue(new Error('MongoDB unavailable'));
    await expect(service.processRoute({ route_id: 'route-a', lat: 1, lng: 2 }))
      .rejects.toThrow('MongoDB unavailable');
    expect(gateway.emitNewPoints).not.toHaveBeenCalled();
  });

  it.each([
    { route_id: 'route-a', lat: 91, lng: 0 },
    { route_id: 'route-a', lat: -91, lng: 0 },
    { route_id: 'route-a', lat: 0, lng: 181 },
    { route_id: 'route-a', lat: 0, lng: -181 },
    { route_id: 'route-a', lat: NaN, lng: 0 },
    { route_id: 'route-a', lat: Infinity, lng: 0 },
    { route_id: 'route-a', lat: 0, lng: Infinity },
    { route_id: '', lat: 0, lng: 0 },
    { route_id: '   ', lat: 0, lng: 0 },
    { route_id: 'route-a', lat: '0', lng: 0 },
  ])('NEST-T09 rejeita coordenada ou ID inválido antes de persistir: %p', async (input) => {
    const { BadRequestException } = require('@nestjs/common');
    await expect(service.processRoute(input as any)).rejects.toThrow(BadRequestException);
    expect(prisma.routeDriver.upsert).not.toHaveBeenCalled();
    expect(gateway.emitNewPoints).not.toHaveBeenCalled();
  });

});
