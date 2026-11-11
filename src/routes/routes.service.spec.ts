import { RoutesService } from './routes.service';

describe('RoutesService — domínio de rotas sem rede externa', () => {
  const directions = { getDirections: jest.fn() };
  const prisma = {
    route: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const kafka = { send: jest.fn() };
  const service = new RoutesService(prisma as any, directions as any, kafka as any);
  const dto = { name: 'Coleta sintética', source_id: 'origem-a', destination_id: 'destino-b' };
  const maps = {
    available_travel_modes: [],
    geocoded_waypoints: [],
    request: { mode: 'driving' },
    routes: [{
      legs: [{
        start_address: 'Rua A',
        end_address: 'Rua B',
        start_location: { lat: -16.6, lng: -49.2 },
        end_location: { lat: -16.7, lng: -49.3 },
        duration: { value: 600 },
        distance: { value: 4000 },
        steps: [{
          start_location: { lat: -16.6, lng: -49.2 },
          end_location: { lat: -16.7, lng: -49.3 },
        }],
      }],
    }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    directions.getDirections.mockResolvedValue(maps);
    prisma.route.create.mockResolvedValue({ id: 'route-a', name: dto.name });
    prisma.route.findUniqueOrThrow.mockResolvedValue({ id: 'route-a' });
    kafka.send.mockResolvedValue(undefined);
  });

  it('NEST-T01 cria rota com direções e publica evento Kafka consistente', async () => {
    const result = await service.create(dto);
    expect(result.id).toBe('route-a');
    expect(directions.getDirections).toHaveBeenCalledWith('origem-a', 'destino-b');
    expect(prisma.route.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: dto.name,
        distance: 4000,
        duration: 600,
        source: { name: 'Rua A', location: { lat: -16.6, lng: -49.2 } },
        destination: { name: 'Rua B', location: { lat: -16.7, lng: -49.3 } },
      }),
    });
    const sent = kafka.send.mock.calls[0][0];
    expect(sent.topic).toBe('route');
    const event = JSON.parse(sent.messages[0].value);
    expect(event).toEqual({
      event: 'RouteCreated', id: 'route-a', distance: 4000,
      directions: [{ lat: -16.6, lng: -49.2 }, { lat: -16.7, lng: -49.3 }],
    });
  });

  it('NEST-T02 falha de Google Maps não grava rota nem publica Kafka', async () => {
    directions.getDirections.mockRejectedValue(new Error('Google Maps indisponível'));
    await expect(service.create(dto)).rejects.toThrow('Google Maps indisponível');
    expect(prisma.route.create).not.toHaveBeenCalled();
    expect(kafka.send).not.toHaveBeenCalled();
  });

  it('NEST-T04 rota inexistente não publica DeliveryStarted', async () => {
    prisma.route.findUniqueOrThrow.mockRejectedValue(new Error('Route not found'));
    await expect(service.startRoute('nao-existe')).rejects.toThrow('Route not found');
    expect(kafka.send).not.toHaveBeenCalled();
  });

  it('NEST-T04 rota existente publica DeliveryStarted com route_id', async () => {
    await service.startRoute('route-a');
    expect(kafka.send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(kafka.send.mock.calls[0][0].messages[0].value)).toEqual({
      event: 'DeliveryStarted', route_id: 'route-a',
    });
  });

  it('NEST-T05 findOne usa ID sem retornar dados de outra consulta', async () => {
    await service.findOne('route-a');
    expect(prisma.route.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'route-a' } });
  });
});
