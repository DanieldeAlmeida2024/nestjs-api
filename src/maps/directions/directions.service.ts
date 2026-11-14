import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  DirectionsRequest,
  Client as GoogleMapsClient,
  TravelMode,
} from '@googlemaps/google-maps-services-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DirectionsService {
  constructor(
    private googleMapsClient: GoogleMapsClient,
    private configService: ConfigService,
  ) {}
  async getDirections(originId: string, destinationId: string) {
    const requestParams: DirectionsRequest['params'] = {
      origin: `place_id:${originId}`,
      destination: `place_id:${destinationId}`,
      mode: TravelMode.driving,
      key: this.configService.get('GOOGLE_MAPS_API_KEY'),
    };

    const { data } = await this.googleMapsClient.directions({
      params: requestParams,
    });
    // ZERO_RESULTS and malformed upstream responses must not crash with
    // an unhandled TypeError while constructing the request projection.
    const leg = data.routes?.[0]?.legs?.[0];
    if (
      !leg ||
      !Number.isFinite(leg.start_location?.lat) ||
      !Number.isFinite(leg.start_location?.lng) ||
      !Number.isFinite(leg.end_location?.lat) ||
      !Number.isFinite(leg.end_location?.lng)
    ) {
      throw new BadGatewayException('Google Maps não retornou uma rota com coordenadas válidas');
    }

    return {
      ...data,
      request: {
        origin: {
          place_id: requestParams.origin,
          location: {
            lat: leg.start_location.lat,
            lng: leg.start_location.lng,
          },
        },
        destination: {
          place_id: requestParams.destination,
          location: {
            lat: leg.end_location.lat,
            lng: leg.end_location.lng,
          },
        },
        mode: requestParams.mode,
      },
    };
  }
}
