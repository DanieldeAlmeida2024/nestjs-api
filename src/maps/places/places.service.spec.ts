import { PlacesService } from './places.service';

describe('PlacesService — consulta isolada de rede', () => {
  const google = { findPlaceFromText: jest.fn() };
  const config = { get: jest.fn().mockReturnValue('fake-maps-key') };
  const service = new PlacesService(google as any, config as any);

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue('fake-maps-key');
  });

  it('consulta o texto e limita campos da API Maps', async () => {
    const value = { status: 'OK', candidates: [{ place_id: 'fake-place' }] };
    google.findPlaceFromText.mockResolvedValue({ data: value });
    await expect(service.findPlaces('Praça teste')).resolves.toEqual(value);
    expect(google.findPlaceFromText).toHaveBeenCalledWith({
      params: {
        input: 'Praça teste',
        inputtype: 'textquery',
        fields: ['place_id', 'formatted_address', 'geometry', 'name'],
        key: 'fake-maps-key',
      },
    });
  });

  it('propaga erro do provedor sem retornar candidatos fictícios', async () => {
    google.findPlaceFromText.mockRejectedValue(new Error('Maps rate limit'));
    await expect(service.findPlaces('Praça teste')).rejects.toThrow('Maps rate limit');
  });
});
