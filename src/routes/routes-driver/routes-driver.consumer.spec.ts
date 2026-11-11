import { BadRequestException } from '@nestjs/common';
import { RoutesDriverConsumer } from './routes-driver.consumer';
import { RoutesDriverService } from './routes-driver.service';

describe('RoutesDriverConsumer — Kafka simulation sem loopback HTTP', () => {
  const prisma = { routeDriver: { upsert: jest.fn() } };
  const gateway = { emitNewPoints: jest.fn() };
  const service = new RoutesDriverService(prisma as any, gateway as any);
  const consumer = new RoutesDriverConsumer(service);
  const msg = (value: unknown) => ({ topic: 'simulation', messageValue: value }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.routeDriver.upsert.mockResolvedValue({ route_id: '507f1f77bcf86cd799439011' });
  });

  it('NEST-T07 persiste o ponto e emite via gateway sem HTTP', async () => {
    const point = { route_id: '507f1f77bcf86cd799439011', lat: -16.68, lng: -49.25 };
    await consumer.driverMoved(msg(point));
    expect(prisma.routeDriver.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { route_id: point.route_id } })
    );
    expect(gateway.emitNewPoints).toHaveBeenCalledWith(point);
  });

  it.each([
    { route_id: 'r1', lat: 91, lng: -49 },
    { route_id: 'r1', lat: -16, lng: 181 },
    { route_id: 'r1', lat: '0', lng: -49 },
    { route_id: '', lat: -16, lng: -49 },
    {},
  ])('NEST-T07 falha em payload inválido sem escrever nem emitir: %p', async (data) => {
    await expect(consumer.driverMoved(msg(data))).rejects.toThrow(BadRequestException);
    expect(prisma.routeDriver.upsert).not.toHaveBeenCalled();
    expect(gateway.emitNewPoints).not.toHaveBeenCalled();
  });

  it('NEST-T07 propaga erro do banco sem emitir atualização inexistente', async () => {
    prisma.routeDriver.upsert.mockRejectedValue(new Error('MongoDB unavailable'));
    await expect(consumer.driverMoved(msg({
      route_id: '507f1f77bcf86cd799439011', lat: -16, lng: -49
    }))).rejects.toThrow('MongoDB unavailable');
    expect(gateway.emitNewPoints).not.toHaveBeenCalled();
  });
});
