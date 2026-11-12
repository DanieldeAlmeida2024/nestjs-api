import { Module } from '@nestjs/common';
import { PlacesController } from './places/places.controller';
import { PlacesService } from './places/places.service';
import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';
import { DirectionsController } from './directions/directions.controller';
import { DirectionsService } from './directions/directions.service';
import { InternalServiceGuard } from '../security/http-access.guards';

@Module({
  controllers: [PlacesController, DirectionsController],
  providers: [
    PlacesService,
    {
      provide: GoogleMapsClient,
      useValue: new GoogleMapsClient(),
    },
    DirectionsService,
    InternalServiceGuard,
  ],
  exports: [DirectionsService],
})
export class MapsModule {}
