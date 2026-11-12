import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InternalServiceGuard } from '../../security/http-access.guards';
import { PlacesService } from './places.service';

@UseGuards(InternalServiceGuard)
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  findPlaces(@Query('text') text: string) {
    return this.placesService.findPlaces(text);
  }
}
