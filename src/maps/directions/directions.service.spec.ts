import { DirectionsService } from './directions.service';

describe('DirectionsService — contrato Google Maps', () => {
  const google = { directions: jest.fn() };
  const config = { get: jest.fn().mockReturnValue('chave-ficticia-teste') };
  const service = new DirectionsService(google as any, config as any);

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue('chave-ficticia-teste');
  });

  it('encaminha place_id, modo driving e monta resposta de origem/destino', async () => {
    google.directions.mockResolvedValue({
      data: {
        status: 'OK',
        routes: [{
          legs: [{
            start_location: { lat: -16, lng: -49 },
            end_location: { lat: -17, lng: -50 },
          }],
        }],
      },
    });
    const result = await service.getDirections('origem', 'destino');
    expect(google.directions).toHaveBeenCalledWith({
      params: expect.objectContaining({
        origin: 'place_id:origem',
        destination: 'place_id:destino',
        mode: 'driving',
        key: 'chave-ficticia-teste',
      }),
    });
    expect(result.request.origin.location).toEqual({ lat: -16, lng: -49 });
    expect(result.request.destination.location).toEqual({ lat: -17, lng: -50 });
  });

  it('propaga erro de provedor, sem inventar direção', async () => {
    google.directions.mockRejectedValue(new Error('Google Maps unavailable'));
    await expect(service.getDirections('origem', 'destino')).rejects.toThrow(
      'Google Maps unavailable',
    );
  });
});
