import { WsException } from '@nestjs/websockets';
import { RoutesDriverGateway } from './routes-driver.gateway';
import {
  issueRouteAccessToken, readRouteAccessToken, routeRoom,
} from './route-access-policy';

const SECRET = 'local-test-secret-that-is-longer-than-32-bytes-only';
const ROUTE = '507f1f77bcf86cd799439011';
const ANOTHER = '507f1f77bcf86cd799439012';

function mockClient(token: unknown) {
  const handlers: Record<string, () => void> = {};
  return {
    handshake: { auth: { token } },
    data: {},
    connected: true,
    join: jest.fn(),
    disconnect: jest.fn(function (this: any) {
      this.connected = false;
    }),
    once: jest.fn((name: string, fn: () => void) => { handlers[name] = fn; }),
    handlers,
  } as any;
}

describe('RoutesDriverGateway — autorização por rota', () => {
  const routes = { findOne: jest.fn() };
  let gateway: RoutesDriverGateway;
  let emitter: { emit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    process.env.ROUTES_WS_TOKEN_SECRET = SECRET;
    gateway = new RoutesDriverGateway(routes as any);
    emitter = { emit: jest.fn() };
    gateway.server = { to: jest.fn().mockReturnValue(emitter) } as any;
  });

  afterEach(() => {
    delete process.env.ROUTES_WS_TOKEN_SECRET;
    jest.useRealTimers();
  });

  it('NEST-WS01 sem token: desconecta sem entrar na sala', () => {
    const client = mockClient(undefined);
    gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('NEST-WS02 token de leitura permite somente sala da própria rota', async () => {
    const client = mockClient(issueRouteAccessToken(ROUTE, 'read', SECRET));
    gateway.handleConnection(client);
    expect(client.join).toHaveBeenCalledWith(routeRoom(ROUTE));
    expect(client.data.routeAccess.routeId).toBe(ROUTE);
    await expect(gateway.handleMessage(client, { route_id: ROUTE }))
      .rejects.toBeInstanceOf(WsException);
    expect(routes.findOne).not.toHaveBeenCalled();
    client.handlers.disconnect?.();
  });

  it('NEST-WS03 simulação com token de outra rota é negada', async () => {
    const client = mockClient(issueRouteAccessToken(ROUTE, 'simulate', SECRET));
    gateway.handleConnection(client);
    await expect(gateway.handleMessage(client, { route_id: ANOTHER }))
      .rejects.toBeInstanceOf(WsException);
    expect(routes.findOne).not.toHaveBeenCalled();
    client.handlers.disconnect?.();
  });

  it('NEST-WS04 não publica pontos em canal global nem em outra rota', () => {
    const point = { route_id: ROUTE, lat: -16.6, lng: -49.2 };
    gateway.emitNewPoints(point);
    expect(gateway.server.to).toHaveBeenCalledWith(routeRoom(ROUTE));
    expect(emitter.emit).toHaveBeenCalledTimes(1);
    expect(emitter.emit).toHaveBeenCalledWith(
      `server:new-points/${ROUTE}:list`, point,
    );
  });

  it('NEST-WS05 simulação autenticada emite somente na sala autorizada', async () => {
    jest.useFakeTimers();
    const client = mockClient(issueRouteAccessToken(ROUTE, 'simulate', SECRET));
    gateway.handleConnection(client);
    routes.findOne.mockResolvedValue({
      directions: { routes: [{ legs: [{ steps: [{
        start_location: { lat: -16.6, lng: -49.2 },
        end_location: { lat: -16.7, lng: -49.3 },
      }] }] }] },
    });
    const operation = gateway.handleMessage(client, { route_id: ROUTE });
    await jest.runAllTimersAsync();
    await operation;
    expect(routes.findOne).toHaveBeenCalledWith(ROUTE);
    expect(emitter.emit).toHaveBeenCalledTimes(2);
    expect(emitter.emit).toHaveBeenNthCalledWith(1,
      `server:new-points/${ROUTE}:list`,
      { route_id: ROUTE, lat: -16.6, lng: -49.2 });
    expect(emitter.emit).toHaveBeenNthCalledWith(2,
      `server:new-points/${ROUTE}:list`,
      { route_id: ROUTE, lat: -16.7, lng: -49.3 });
    client.handlers.disconnect?.();
  });

  it('NEST-WS06 expirado ou adulterado não autentica', () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = issueRouteAccessToken(ROUTE, 'read', SECRET, now - 45, 10);
    expect(readRouteAccessToken(expired, SECRET, now)).toBeNull();
    const good = issueRouteAccessToken(ROUTE, 'read', SECRET, now, 30);
    expect(readRouteAccessToken(good.slice(0, -4) + 'aabb', SECRET, now)).toBeNull();
    expect(readRouteAccessToken(good, 'short', now)).toBeNull();
    expect(readRouteAccessToken(good, SECRET, now)).toEqual(
      expect.objectContaining({ routeId: ROUTE, scope: 'read' }));
  });

  it('NEST-WS07 credenciais não podem exceder 15 minutos', () => {
    expect(() => issueRouteAccessToken(ROUTE, 'read', SECRET, 100, 901))
      .toThrow();
    expect(() => issueRouteAccessToken('bad:room', 'read', SECRET))
      .toThrow();
  });
});
