import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InternalServiceGuard } from '../../security/http-access.guards';
import { DirectionsService } from './directions.service';

@UseGuards(InternalServiceGuard)
@Controller('directions')
export class DirectionsController {
  constructor(private directionsService: DirectionsService) {}
  @Get()
  getDirections(
    @Query('originId') originId: string,
    @Query('destinationId') destinationId: string,
  ) {
    return this.directionsService.getDirections(originId, destinationId);
  }
}
