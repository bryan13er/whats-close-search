// lib/PlacesAPI.js

const AUTOCOMPLETE_ENDPOINT = 'https://places.googleapis.com/v1/places:autocomplete';
const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

export class PlacesAPI {
  constructor(apiKey) {
    if (!apiKey) throw new Error('API key is required');
    this.apiKey = apiKey;
  }

  /**
   * Get place predictions for a text input
   * @param {string} input
   * @returns {Promise<Array>}
   */
  async autocomplete(input) {
    if (!input || input.length < 3) return [];

    const response = await fetch(AUTOCOMPLETE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      throw new Error(`Places API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.suggestions ?? [];
  }

  /**
   * Get lat/lng and address for a place ID
   * @param {string} placeId
   * @returns {Promise<{lat: number, lng: number, address: string}>}
   */
  async geocode(placeId) {
    if (!placeId) throw new Error('placeId is required');

    const response = await fetch(
      `${GEOCODE_ENDPOINT}?place_id=${placeId}&key=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Geocode API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.results?.[0];

    return {
      address: result?.formatted_address ?? '',
      lat: result?.geometry?.location?.lat ?? null,
      lng: result?.geometry?.location?.lng ?? null,
    };
  }
}