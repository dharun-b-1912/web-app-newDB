// src/services/location/googleMapsService.ts
// ============================================================================
// Joy PeopleHR — Google Maps Platform Service
// Manages Google Maps JS API loader, Reverse Geocoding for live staff GPS,
// custom employee avatar markers, and route polyline rendering.
// ============================================================================

import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

declare global {
  interface Window {
    google?: any;
  }
}

export const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyCjt7M299tgviXLU0SQCzRxdwaFxqneej4';

let isConfigured = false;
let googleMapsPromise: Promise<any> | null = null;
const addressCache = new Map<string, string>();

/**
 * Initializes and loads the Google Maps JavaScript API.
 */
export async function getGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps can only be loaded in the browser');
  }

  if (window.google?.maps) {
    return window.google;
  }

  if (!googleMapsPromise) {
    if (!isConfigured) {
      setOptions({
        key: GOOGLE_MAPS_API_KEY,
        v: 'weekly',
      });
      isConfigured = true;
    }

    googleMapsPromise = Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('geocoding'),
    ]).then(() => {
      return window.google;
    }).catch(async (err) => {
      console.warn('[GoogleMaps] Loader error, falling back to direct script tag:', err);
      return new Promise((resolve, reject) => {
        if (window.google?.maps) return resolve(window.google);
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,marker,geometry`;
        script.async = true;
        script.onload = () => resolve(window.google);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    });
  }

  return googleMapsPromise;
}

export interface ResolvedLocationDetails {
  title: string;
  address: string;
  fullAddress: string;
}

const detailedLocationCache = new Map<string, ResolvedLocationDetails>();

/**
 * Resolves (lat, lng) into both a Place/Landmark name and a human-readable street address
 * directly from Google Maps Platform (Google Places API New + Google Geocoding API).
 * Zero mock or synthetic data is used.
 */
export async function resolveLocationDetails(lat: number, lng: number): Promise<ResolvedLocationDetails> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

  // 1. Check in-memory cache
  if (detailedLocationCache.has(cacheKey)) {
    return detailedLocationCache.get(cacheKey)!;
  }

  // 2. Attempt Google Places API (New) searchNearby for exact Google Maps establishment/place name
  try {
    const placesRes = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.types',
      },
      body: JSON.stringify({
        maxResultCount: 5,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 120.0,
          },
        },
      }),
    });

    if (placesRes.ok) {
      const placesData = await placesRes.json();
      if (placesData.places && placesData.places.length > 0) {
        const firstPlace = placesData.places[0];
        const placeName = firstPlace.displayName?.text;
        let placeAddress = firstPlace.formattedAddress || '';
        placeAddress = placeAddress.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4},\s*/, '');

        if (placeName && placeName.trim().length > 0) {
          const result: ResolvedLocationDetails = {
            title: placeName,
            address: placeAddress || placeName,
            fullAddress: `${placeName} • ${placeAddress || placeName}`,
          };

          detailedLocationCache.set(cacheKey, result);
          addressCache.set(cacheKey, result.fullAddress);
          return result;
        }
      }
    }
  } catch (placesErr) {
    console.info('[GoogleMaps] Places API (New) searchNearby notice:', placesErr);
  }

  // 4. Fallback to Google Geocoding API (Result #0: Most specific premise & street address)
  try {
    await getGoogleMaps();
    const geocodingLib: any = await importLibrary('geocoding').catch(() => null);
    const GeocoderClass = geocodingLib?.Geocoder || window.google?.maps?.Geocoder;

    if (!GeocoderClass) {
      const fallbackStr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      return { title: 'GPS Location', address: fallbackStr, fullAddress: fallbackStr };
    }

    const geocoder = new GeocoderClass();
    const response = await geocoder.geocode({
      location: { lat, lng },
    });

    if (response.results && response.results.length > 0) {
      // Prioritize Result #0: Most granular physical premise / street address
      const primaryResult = response.results[0];
      let fullAddress = primaryResult.formatted_address || '';
      fullAddress = fullAddress.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4},\s*/, '');

      // Identify exact establishment, premise, or sublocality from address_components
      let detectedTitle = '';
      const compPoi = primaryResult.address_components?.find((c: any) =>
        c.types.includes('point_of_interest') || c.types.includes('establishment') || c.types.includes('premise')
      );
      const compSub = primaryResult.address_components?.find((c: any) =>
        c.types.includes('sublocality') || c.types.includes('neighborhood')
      );
      const compRoute = primaryResult.address_components?.find((c: any) =>
        c.types.includes('route')
      );

      detectedTitle =
        compPoi?.long_name ||
        compSub?.long_name ||
        compRoute?.long_name ||
        fullAddress.split(',')[0]?.trim() ||
        'Work Location';

      const result: ResolvedLocationDetails = {
        title: detectedTitle,
        address: fullAddress,
        fullAddress: detectedTitle && !fullAddress.startsWith(detectedTitle)
          ? `${detectedTitle} • ${fullAddress}`
          : fullAddress,
      };

      detailedLocationCache.set(cacheKey, result);
      addressCache.set(cacheKey, result.fullAddress);

      return result;
    }

    const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    return { title: 'GPS Coordinates', address: fallback, fullAddress: fallback };
  } catch (err) {
    console.warn('[GoogleMaps] Reverse geocode error:', err);
    const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    return { title: 'Location Signal', address: fallback, fullAddress: fallback };
  }
}

/**
 * Performs Reverse Geocoding to convert raw (lat, lng) into a human-readable street address.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const details = await resolveLocationDetails(lat, lng);
  return details.fullAddress;
}

/**
 * Creates an interactive Google Map instance with standard controls.
 */
export async function createGoogleMapInstance(
  element: HTMLElement,
  options: {
    center: { lat: number; lng: number };
    zoom?: number;
    mapTypeId?: 'roadmap' | 'satellite' | 'hybrid';
  }
): Promise<any> {
  await getGoogleMaps();
  const mapsLib: any = await importLibrary('maps').catch(() => null);
  const MapClass = mapsLib?.Map || window.google?.maps?.Map;

  if (!MapClass) {
    throw new Error('Google Maps Map constructor not available');
  }

  const map = new MapClass(element, {
    center: options.center,
    zoom: options.zoom ?? 16,
    mapTypeId: options.mapTypeId ?? 'roadmap',
    fullscreenControl: false,
    streetViewControl: true,
    mapTypeControl: false,
    zoomControl: false, // Custom controls in React UI
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'on' }],
      },
      {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [{ visibility: 'simplified' }],
      },
    ],
  });

  return map;
}

/**
 * Decodes an encoded polyline string (Google Maps algorithm) into an array of LatLng coordinates.
 */
export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

export interface ComputedRouteResult {
  distanceMeters: number;
  durationSeconds: number;
  polylinePoints: { lat: number; lng: number }[];
}

/**
 * Computes road-following routes via Google Routes API (v2).
 * Works natively on all modern Google Cloud projects without requiring the legacy Directions API.
 */
export async function computeRoadRouteViaRoutesApi(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  intermediates?: { lat: number; lng: number }[]
): Promise<ComputedRouteResult | null> {
  try {
    const intermediatesPayload = (intermediates || []).slice(0, 25).map((pt) => ({
      location: {
        latLng: {
          latitude: pt.lat,
          longitude: pt.lng,
        },
      },
    }));

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.lat,
              longitude: origin.lng,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.lat,
              longitude: destination.lng,
            },
          },
        },
        intermediates: intermediatesPayload.length > 0 ? intermediatesPayload : undefined,
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
      }),
    });

    if (!response.ok) {
      console.warn('[RoutesAPI] computeRoutes HTTP error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      const encoded = primaryRoute.polyline?.encodedPolyline;
      const polylinePoints = encoded ? decodePolyline(encoded) : [];

      let durationSeconds = 0;
      if (typeof primaryRoute.duration === 'string') {
        durationSeconds = parseInt(primaryRoute.duration.replace('s', ''), 10) || 0;
      }

      return {
        distanceMeters: primaryRoute.distanceMeters || 0,
        durationSeconds,
        polylinePoints,
      };
    }
  } catch (err) {
    console.warn('[RoutesAPI] computeRoutes exception:', err);
  }
  return null;
}
