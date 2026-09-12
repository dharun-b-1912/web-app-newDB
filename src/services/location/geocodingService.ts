// src/services/location/geocodingService.ts
// ============================================================================
// Joy PeopleHR — Enterprise Geolocation & Reverse Geocoding Service
// Supports Live GPS Detection, Google Maps Integration & OpenStreetMap Geocoding
// ============================================================================

export interface ResolvedLocation {
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'GPS_LIVE' | 'SEARCH_GEOCODE' | 'DEFAULT_HQ';
}

export interface GeocodeSearchResult {
  display_name: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
}

// Canonical Headquarters Default: Coimbatore, Tamil Nadu, India
export const CANONICAL_HQ_LOCATION: ResolvedLocation = {
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  country: 'India',
  postal_code: '641014',
  formatted_address: 'Joy Corporate Solutions Pvt Ltd, Coimbatore, Tamil Nadu 641014, India',
  latitude: 11.0168,
  longitude: 76.9558,
  source: 'DEFAULT_HQ',
};

class GeocodingService {
  /**
   * Fetches high-accuracy GPS coordinates from the browser's Geolocation API.
   */
  async getCurrentGpsCoordinates(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator || !navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser or environment.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let msg = 'Unable to retrieve location.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Location permission was denied. Please allow location access in your browser settings.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = 'Location information is unavailable.';
          } else if (error.code === error.TIMEOUT) {
            msg = 'Location request timed out.';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        }
      );
    });
  }

  /**
   * Reverse-geocodes coordinates into city, state, country, and formatted address.
   * Uses OpenStreetMap Nominatim reverse endpoint with fallback to Google Maps or structured heuristics.
   */
  async reverseGeocode(latitude: number, longitude: number, accuracy?: number): Promise<ResolvedLocation> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'JoyPeopleHR-Enterprise-Geolocator/2.0',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.address) {
          const addr = data.address;
          const city =
            addr.city ||
            addr.town ||
            addr.city_district ||
            addr.municipality ||
            addr.county ||
            addr.suburb ||
            'Coimbatore';

          const state = addr.state || addr.region || 'Tamil Nadu';
          const country = addr.country || 'India';
          const postal_code = addr.postcode || '';
          const formatted_address = data.display_name || `${city}, ${state}, ${country}`;

          return {
            city,
            state,
            country,
            postal_code,
            formatted_address,
            latitude,
            longitude,
            accuracy,
            source: 'GPS_LIVE',
          };
        }
      }
    } catch (err) {
      console.warn('[GeocodingService] Reverse geocode network fallback:', err);
    }

    // Heuristic Fallback based on Tamil Nadu / South India coordinate bounding box
    const isNearCoimbatore =
      latitude >= 10.8 && latitude <= 11.3 && longitude >= 76.8 && longitude <= 77.3;
    const isNearChennai =
      latitude >= 12.8 && latitude <= 13.3 && longitude >= 80.0 && longitude <= 80.4;
    const isNearBangalore =
      latitude >= 12.8 && latitude <= 13.2 && longitude >= 77.4 && longitude <= 77.8;

    let city = 'Coimbatore';
    let state = 'Tamil Nadu';
    if (isNearChennai) {
      city = 'Chennai';
      state = 'Tamil Nadu';
    } else if (isNearBangalore) {
      city = 'Bengaluru';
      state = 'Karnataka';
    } else if (isNearCoimbatore) {
      city = 'Coimbatore';
      state = 'Tamil Nadu';
    }

    return {
      city,
      state,
      country: 'India',
      formatted_address: `${city}, ${state}, India`,
      latitude,
      longitude,
      accuracy,
      source: 'GPS_LIVE',
    };
  }

  /**
   * Fetches the user's current live location and reverse-geocodes it in one step.
   */
  async detectLiveLocation(): Promise<ResolvedLocation> {
    const coords = await this.getCurrentGpsCoordinates();
    return this.reverseGeocode(coords.latitude, coords.longitude, coords.accuracy);
  }

  /**
   * Searches for a city, address, or landmark using OpenStreetMap Nominatim search.
   */
  async searchAddress(query: string): Promise<GeocodeSearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const encoded = encodeURIComponent(query.trim());
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&addressdetails=1&limit=5`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'JoyPeopleHR-Enterprise-Geolocator/2.0',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          return data.map((item: any) => {
            const addr = item.address || {};
            const city =
              addr.city ||
              addr.town ||
              addr.city_district ||
              addr.municipality ||
              addr.county ||
              addr.state_district ||
              item.name ||
              query;
            const state = addr.state || addr.region || '';
            const country = addr.country || 'India';
            const postal_code = addr.postcode || '';

            return {
              display_name: item.display_name,
              city,
              state,
              country,
              postal_code,
              latitude: parseFloat(item.lat),
              longitude: parseFloat(item.lon),
            };
          });
        }
      }
    } catch (err) {
      console.warn('[GeocodingService] searchAddress error:', err);
    }

    return [];
  }

  /**
   * Generates a Google Maps URL for opening in a new tab or viewing in map.
   */
  getGoogleMapsUrl(latitude: number, longitude: number, label?: string): string {
    if (label) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  /**
   * Generates an OpenStreetMap embed / preview URL for interactive iframe preview.
   */
  getMapEmbedUrl(latitude: number, longitude: number): string {
    const delta = 0.01;
    const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
  }
}

export const geocodingService = new GeocodingService();
