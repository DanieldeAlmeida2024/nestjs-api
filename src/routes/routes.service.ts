import { BadGatewayException, Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { PrismaService } from '../prisma/prisma.service';
import { DirectionsService } from '../maps/directions/directions.service';
import * as kafkaLib from '@confluentinc/kafka-javascript';

// The Go simulator emits one movement per point, one second apart.
// Keep the producer within its 600-point processing budget.
export const MAX_ROUTE_SIMULATION_POINTS = 600;

@Injectable()
export class RoutesService {
  constructor(
    private prismaService: PrismaService,
    private directionsService: DirectionsService,
    @Inject('KAFKA_PRODUCER') private kafkaProducer: kafkaLib.KafkaJS.Producer,
  ) {}

  async create(createRouteDto: CreateRouteDto) {
    const { available_travel_modes, geocoded_waypoints, routes, request } =
      await this.directionsService.getDirections(
        createRouteDto.source_id,
        createRouteDto.destination_id,
      );

    const legs = routes?.[0]?.legs?.[0];
    if (
      !legs ||
      !Array.isArray(legs.steps) ||
      legs.steps.length === 0 ||
      legs.steps.length * 2 > MAX_ROUTE_SIMULATION_POINTS ||
      !Number.isSafeInteger(legs.distance?.value) ||
      legs.distance.value < 0 ||
      !Number.isSafeInteger(legs.duration?.value) ||
      legs.duration.value < 0
    ) {
      throw new BadGatewayException('Direções inválidas ou rota excede o limite de simulação');
    }

    const directions = legs.steps.flatMap((step) => [
      { lat: step.start_location?.lat, lng: step.start_location?.lng },
      { lat: step.end_location?.lat, lng: step.end_location?.lng },
    ]);
    if (directions.some(({ lat, lng }) =>
      typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
      typeof lng !== 'number' || !Number.isFinite(lng) || Math.abs(lng) > 180
    )) {
      throw new BadGatewayException('Coordenadas inválidas no retorno de direções');
    }

    // Validate the downstream Kafka contract before writing the route to Mongo.
    const route = await this.prismaService.route.create({
      data: {
        name: createRouteDto.name,
        source: {
          name: legs.start_address,
          location: {
            lat: legs.start_location.lat,
            lng: legs.start_location.lng,
          },
        },
        destination: {
          name: legs.end_address,
          location: {
            lat: legs.end_location.lat,
            lng: legs.end_location.lng,
          },
        },
        duration: legs.duration.value,
        distance: legs.distance.value,
        directions: JSON.parse(
          JSON.stringify({
            available_travel_modes,
            geocoded_waypoints,
            routes,
            request,
          }),
        ),
      },
    });

    await this.kafkaProducer.send({
      topic: 'route',
      messages: [
        {
          value: JSON.stringify({
            event: 'RouteCreated',
            id: route.id,
            distance: legs.distance.value,
            directions,
          }),
        },
      ],
    });

    return route;
  }

  async startRoute(id: string) {
    await this.prismaService.route.findUniqueOrThrow({
      where: { id },
    });

    await this.kafkaProducer.send({
      topic: 'route',
      messages: [
        {
          value: JSON.stringify({
            event: 'DeliveryStarted',
            route_id: id,
          }),
        },
      ],
    });
  }

  findAll() {
    return this.prismaService.route.findMany();
  }

  findOne(id: string) {
    return this.prismaService.route.findUniqueOrThrow({
      where: { id },
    });
  }

  update(id: string, updateRouteDto: UpdateRouteDto) {
    return this.prismaService.route.update({
      where: { id },
      data: updateRouteDto,
    });
  }

  remove(_id: string): never {
    // Fail closed: o endpoint não deve fingir ter excluído uma rota.
    // Exclusão real requer autorização de proprietário, cascata e auditoria.
    throw new NotImplementedException('Exclusão de rotas indisponível');
  }
}
