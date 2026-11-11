import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { KafkaContext } from '../../kafka/kafka-context';
import { RoutesDriverService } from './routes-driver.service';

@Controller()
export class RoutesDriverConsumer {
  private readonly logger = new Logger(RoutesDriverConsumer.name);

  constructor(private readonly routesDriverService: RoutesDriverService) {}

  @MessagePattern('simulation')
  async driverMoved(payload: KafkaContext) {
    // Não registrar a mensagem inteira: contém trajetória/coordenadas.
    this.logger.log(`Recebido evento de ${payload?.topic ?? 'simulation'}`);
    const { route_id, lat, lng } = payload?.messageValue ?? {};
    // O service reaproveita as verificações de ID e lat/lng e só publica
    // no WebSocket após persistência. Sem requisição HTTP para localhost.
    await this.routesDriverService.processRoute({ route_id, lat, lng });
  }
}
