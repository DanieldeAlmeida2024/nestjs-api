import { RoutesDriverGateway } from './routes-driver.gateway';

describe('RoutesDriverGateway — pontos por rota', () => {
  const routes = { findOne: jest.fn() };
  let gateway: RoutesDriverGateway;
  let client: any;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new RoutesDriverGateway(routes as any);
    client = { emit: jest.fn(), broadcast: { emit: jest.fn() } };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('NEST-T08 emite ponto individual na rota e no canal global', () => {
    const server = { emit: jest.fn() };
    gateway.server = server as any;
    const point = { route_id: 'route-a', lat: -16.7, lng: -49.3 };
    gateway.emitNewPoints(point);
    expect(server.emit).toHaveBeenCalledTimes(2);
    expect(server.emit).toHaveBeenNthCalledWith(
      1, 'server:new-points/route-a:list', point,
    );
    expect(server.emit).toHaveBeenNthCalledWith(
      2, 'server:new-points:list', point,
    );
  });

  it('NEST-T08 transmissão simulada envia coordenadas de início E de fim', async () => {
    jest.useFakeTimers();
    routes.findOne.mockResolvedValue({
      directions: {
        routes: [{ legs: [{ steps: [{
          start_location: { lat: -16.6, lng: -49.2 },
          end_location: { lat: -16.7, lng: -49.3 },
        }] }] }],
      },
    });
    const operation = gateway.handleMessage(client, { route_id: 'route-a' });
    await jest.runAllTimersAsync();
    await operation;
    expect(routes.findOne).toHaveBeenCalledWith('route-a');
    expect(client.emit).toHaveBeenNthCalledWith(
      1, 'server:new-points/route-a:list',
      { route_id: 'route-a', lat: -16.6, lng: -49.2 },
    );
    expect(client.emit).toHaveBeenNthCalledWith(
      2, 'server:new-points/route-a:list',
      { route_id: 'route-a', lat: -16.7, lng: -49.3 },
    );
    expect(client.broadcast.emit).toHaveBeenNthCalledWith(
      1, 'server:new-points:list',
      { route_id: 'route-a', lat: -16.6, lng: -49.2 },
    );
    expect(client.broadcast.emit).toHaveBeenNthCalledWith(
      2, 'server:new-points:list',
      { route_id: 'route-a', lat: -16.7, lng: -49.3 },
    );
  });
});
