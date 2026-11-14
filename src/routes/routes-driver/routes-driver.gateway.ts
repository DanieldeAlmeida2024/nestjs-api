import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RoutesService } from '../routes.service';
import {
  readRouteAccessToken,
  routeRoom,
  type RouteAccessClaims,
} from './route-access-policy';

// Browsers must come from an explicitly configured origin. Socket.IO CORS
// cannot replace authentication, especially for non-browser clients.
const allowedOrigins = (process.env.ROUTES_WS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

@WebSocketGateway({ cors: { origin: allowedOrigins, credentials: false } })
export class RoutesDriverGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RoutesDriverGateway.name);

  constructor(private readonly routesService: RoutesService) {}

  handleConnection(client: Socket) {
    const claims = readRouteAccessToken(
      client.handshake?.auth?.token,
      process.env.ROUTES_WS_TOKEN_SECRET,
    );
    if (!claims) {
      client.disconnect(true);
      return;
    }

    client.data.routeAccess = claims;
    void client.join(routeRoom(claims.routeId));

    // A capability expires even if a connection stays open.
    const timeLeftMs = Math.max(0, (claims.exp - Math.floor(Date.now() / 1000)) * 1000);
    const timeout = setTimeout(() => client.disconnect(true), timeLeftMs);
    timeout.unref?.();
    client.once('disconnect', () => clearTimeout(timeout));
  }

  @SubscribeMessage('client:new-points')
  async handleMessage(client: Socket, payload: { route_id?: unknown }) {
    const claims: RouteAccessClaims | undefined = client.data?.routeAccess;
    const current = readRouteAccessToken(
      client.handshake?.auth?.token,
      process.env.ROUTES_WS_TOKEN_SECRET,
    );
    if (!claims || !current || claims.routeId !== current.routeId ||
        current.scope !== 'simulate' || claims.scope !== 'simulate' ||
        typeof payload?.route_id !== 'string' ||
        payload.route_id !== claims.routeId) {
      throw new WsException('Não autorizado para simular esta rota');
    }

    const routeId = claims.routeId;
    const route = await this.routesService.findOne(routeId);
    const steps = route?.directions?.routes?.[0]?.legs?.[0]?.steps;
    if (!Array.isArray(steps)) {
      throw new WsException('Rota sem passos válidos');
    }

    for (const step of steps) {
      // Expired or disconnected capabilities may not continue sending points.
      if (!client.connected || !readRouteAccessToken(
        client.handshake?.auth?.token,
        process.env.ROUTES_WS_TOKEN_SECRET,
      )) break;

      this.emitNewPoints({
        route_id: routeId,
        lat: step.start_location.lat,
        lng: step.start_location.lng,
      });
      await sleep(2000);
      if (!client.connected || !readRouteAccessToken(
        client.handshake?.auth?.token,
        process.env.ROUTES_WS_TOKEN_SECRET,
      )) break;
      this.emitNewPoints({
        route_id: routeId,
        lat: step.end_location.lat,
        lng: step.end_location.lng,
      });
      await sleep(2000);
    }
  }

  emitNewPoints(payload: { route_id: string; lat: number; lng: number }) {
    if (!this.server) {
      this.logger.warn('Gateway ainda não inicializado; ponto não transmitido');
      return;
    }
    // Never broadcast GPS points to global listeners or another route.
    this.server.to(routeRoom(payload.route_id)).emit(
      `server:new-points/${payload.route_id}:list`,
      payload,
    );
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
