import { INestApplication, NotImplementedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { RoutesController } from '../routes/routes.controller';
import { RoutesService } from '../routes/routes.service';
import { RoutesDriverService } from '../routes/routes-driver/routes-driver.service';
import { issueRouteAccessToken } from '../routes/routes-driver/route-access-policy';
import { DirectionsController } from '../maps/directions/directions.controller';
import { DirectionsService } from '../maps/directions/directions.service';
import { PlacesController } from '../maps/places/places.controller';
import { PlacesService } from '../maps/places/places.service';
import { InternalServiceGuard, RouteReadGuard, validInternalApiAuthorization } from './http-access.guards';

const INTERNAL_SECRET = 'internal-http-service-secret-longer-than-32-bytes-v1';
const CAPABILITY_SECRET = 'route-capability-secret-longer-than-32-bytes-v1';
const ROUTE = '507f1f77bcf86cd799439011';
const OTHER = '507f1f77bcf86cd799439012';

describe('NEST-HTTP-B: guardas aplicados aos endpoints HTTP (Nest+Supertest, sem Google/Mongo/Kafka)', () => {
  let app: INestApplication;
  const routes = {
    create: jest.fn(), startRoute: jest.fn(), findAll: jest.fn(),
    findOne: jest.fn(), update: jest.fn(), remove: jest.fn(),
  };
  const tracking = { processRoute: jest.fn() };
  const places = { findPlaces: jest.fn() };
  const directions = { getDirections: jest.fn() };
  const prevInternal = process.env.ROUTES_INTERNAL_API_TOKEN;
  const prevCapability = process.env.ROUTES_WS_TOKEN_SECRET;

  beforeAll(async () => {
    process.env.ROUTES_INTERNAL_API_TOKEN = INTERNAL_SECRET;
    process.env.ROUTES_WS_TOKEN_SECRET = CAPABILITY_SECRET;
    const module = await Test.createTestingModule({
      controllers: [RoutesController, PlacesController, DirectionsController],
      providers: [
        InternalServiceGuard, RouteReadGuard,
        { provide: RoutesService, useValue: routes },
        { provide: RoutesDriverService, useValue: tracking },
        { provide: PlacesService, useValue: places },
        { provide: DirectionsService, useValue: directions },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    routes.create.mockResolvedValue({ id: ROUTE });
    routes.startRoute.mockResolvedValue({ started: true });
    routes.findAll.mockResolvedValue([{ id: ROUTE }]);
    routes.findOne.mockResolvedValue({ id: ROUTE });
    routes.update.mockResolvedValue({ id: ROUTE, name: 'Atualizada' });
    routes.remove.mockImplementation(() => { throw new NotImplementedException(); });
    tracking.processRoute.mockResolvedValue({ route_id: ROUTE });
    places.findPlaces.mockResolvedValue({ candidates: [] });
    directions.getDirections.mockResolvedValue({ routes: [] });
  });
  afterAll(async () => {
    if (prevInternal === undefined) delete process.env.ROUTES_INTERNAL_API_TOKEN;
    else process.env.ROUTES_INTERNAL_API_TOKEN = prevInternal;
    if (prevCapability === undefined) delete process.env.ROUTES_WS_TOKEN_SECRET;
    else process.env.ROUTES_WS_TOKEN_SECRET = prevCapability;
    await app?.close();
  });

  it('NEST-HTTP-B01: endpoints administrativos e APIs faturáveis rejeitam clientes sem credenciais', async () => {
    await request(app.getHttpServer()).post('/routes').send({}).expect(401);
    await request(app.getHttpServer()).post('/routes/' + ROUTE + '/start').expect(401);
    await request(app.getHttpServer()).patch('/routes/' + ROUTE).send({ name: 'x' }).expect(401);
    await request(app.getHttpServer()).get('/routes').expect(401);
    await request(app.getHttpServer()).delete('/routes/' + ROUTE).expect(401);
    await request(app.getHttpServer()).get('/places?text=x').expect(401);
    await request(app.getHttpServer()).get('/directions?originId=x&destinationId=y').expect(401);
    expect(routes.create).not.toHaveBeenCalled();
    expect(routes.startRoute).not.toHaveBeenCalled();
    expect(routes.update).not.toHaveBeenCalled();
    expect(routes.findAll).not.toHaveBeenCalled();
    expect(places.findPlaces).not.toHaveBeenCalled();
    expect(directions.getDirections).not.toHaveBeenCalled();
  });

  it('NEST-HTTP-B02: token interno autoriza chamadas administrativas e Maps', async () => {
    const auth = { Authorization: 'Bearer ' + INTERNAL_SECRET };
    await request(app.getHttpServer()).post('/routes').set(auth).send({ name: 'x' }).expect(201);
    await request(app.getHttpServer()).post('/routes/' + ROUTE + '/start').set(auth).expect(201);
    await request(app.getHttpServer()).patch('/routes/' + ROUTE).set(auth).send({ name: 'Atualizada' }).expect(200);
    await request(app.getHttpServer()).get('/routes').set(auth).expect(200);
    await request(app.getHttpServer()).get('/places?text=x').set(auth).expect(200);
    await request(app.getHttpServer()).get('/directions?originId=x&destinationId=y').set(auth).expect(200);
    expect(routes.create).toHaveBeenCalledTimes(1);
    expect(routes.startRoute).toHaveBeenCalledTimes(1);
    expect(routes.update).toHaveBeenCalledTimes(1);
    expect(routes.findAll).toHaveBeenCalledTimes(1);
    expect(places.findPlaces).toHaveBeenCalledTimes(1);
    expect(directions.getDirections).toHaveBeenCalledTimes(1);
  });

  it('NEST-HTTP-B03: token de rota não substitui o token do serviço interno', async () => {
    const cap = issueRouteAccessToken(ROUTE, 'simulate', CAPABILITY_SECRET);
    await request(app.getHttpServer()).post('/routes').set('Authorization', 'Bearer ' + cap).send({}).expect(401);
    await request(app.getHttpServer()).get('/places').set('Authorization', 'Bearer ' + cap).expect(401);
    expect(routes.create).not.toHaveBeenCalled();
  });

  it('NEST-HTTP-B04: GET de rota requer capability assinada da mesma rota', async () => {
    const good = issueRouteAccessToken(ROUTE, 'read', CAPABILITY_SECRET);
    const badRoute = issueRouteAccessToken(OTHER, 'read', CAPABILITY_SECRET);
    await request(app.getHttpServer()).get('/routes/' + ROUTE).expect(401);
    await request(app.getHttpServer()).get('/routes/' + ROUTE).set('Authorization', 'Bearer ' + badRoute).expect(401);
    await request(app.getHttpServer()).get('/routes/' + ROUTE).set('Authorization', 'Bearer ' + good).expect(200);
    expect(routes.findOne).toHaveBeenCalledTimes(1);
    expect(routes.findOne).toHaveBeenCalledWith(ROUTE);
  });

  it('NEST-HTTP-B05: expirado, adulterado ou segredo ausente negam leitura', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = issueRouteAccessToken(ROUTE, 'read', CAPABILITY_SECRET, now - 100, 10);
    const valid = issueRouteAccessToken(ROUTE, 'read', CAPABILITY_SECRET);
    await request(app.getHttpServer()).get('/routes/' + ROUTE).set('Authorization', 'Bearer ' + expired).expect(401);
    await request(app.getHttpServer()).get('/routes/' + ROUTE).set('Authorization', 'Bearer ' + valid + 'x').expect(401);
    delete process.env.ROUTES_WS_TOKEN_SECRET;
    try { await request(app.getHttpServer()).get('/routes/' + ROUTE).set('Authorization', 'Bearer ' + valid).expect(401); }
    finally { process.env.ROUTES_WS_TOKEN_SECRET = CAPABILITY_SECRET; }
    expect(routes.findOne).not.toHaveBeenCalled();
  });

  it('NEST-HTTP-B06: sem secret interno falha fechado e não consulta API externa', async () => {
    delete process.env.ROUTES_INTERNAL_API_TOKEN;
    try {
      await request(app.getHttpServer()).get('/places?text=x').set('Authorization','Bearer ' + INTERNAL_SECRET).expect(401);
      await request(app.getHttpServer()).post('/routes/' + ROUTE + '/start').set('Authorization','Bearer ' + INTERNAL_SECRET).expect(401);
    } finally { process.env.ROUTES_INTERNAL_API_TOKEN = INTERNAL_SECRET; }
    expect(places.findPlaces).not.toHaveBeenCalled();
    expect(routes.startRoute).not.toHaveBeenCalled();
  });

  it('NEST-HTTP-B07: DELETE segue respondendo 501, mas só após autorização interna', async () => {
    await request(app.getHttpServer()).delete('/routes/' + ROUTE).expect(401);
    expect(routes.remove).not.toHaveBeenCalled();
    await request(app.getHttpServer()).delete('/routes/' + ROUTE)
      .set('Authorization', 'Bearer ' + INTERNAL_SECRET).expect(501);
    expect(routes.remove).toHaveBeenCalledTimes(1);
  });

  it('NEST-HTTP-B08: token de simulação continua válido para process-route, sem acesso a CRUD', async () => {
    const cap = issueRouteAccessToken(ROUTE, 'simulate', CAPABILITY_SECRET);
    await request(app.getHttpServer()).post('/routes/' + ROUTE + '/process-route')
      .set('Authorization','Bearer ' + cap).send({ lat: -16.68, lng: -49.25 }).expect(201);
    expect(tracking.processRoute).toHaveBeenCalledWith({ route_id: ROUTE, lat: -16.68, lng: -49.25 });
    await request(app.getHttpServer()).patch('/routes/' + ROUTE)
      .set('Authorization','Bearer ' + cap).send({ name: 'x' }).expect(401);
    expect(routes.update).not.toHaveBeenCalled();
  });

  it('NEST-HTTP-B09: formato de Bearer e chave fraca negados em comparação de credencial', () => {
    expect(validInternalApiAuthorization('Bearer ' + INTERNAL_SECRET, INTERNAL_SECRET)).toBe(true);
    expect(validInternalApiAuthorization('bearer ' + INTERNAL_SECRET, INTERNAL_SECRET)).toBe(false);
    expect(validInternalApiAuthorization('Basic ' + INTERNAL_SECRET, INTERNAL_SECRET)).toBe(false);
    expect(validInternalApiAuthorization('Bearer ' + INTERNAL_SECRET + 'x', INTERNAL_SECRET)).toBe(false);
    expect(validInternalApiAuthorization('Bearer short','short')).toBe(false);
  });
});
