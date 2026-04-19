import { KOSICE_DEFAULT } from "./constants";

export interface UserCoords {
  lat: number;
  lng: number;
  accuracy: "gps" | "ip" | "default";
}

let cachedLocation: UserCoords | null = null;
let gpsRetryAfter = 0;

const GPS_RETRY_COOLDOWN_MS = 60_000;
const LOCATION_CACHE_MS = 20_000;
let cachedAt = 0;

// Browser-side: GPS first, IP second, Košice fallback last
export async function getUserLocation(): Promise<UserCoords> {
  if (typeof window === "undefined") {
    return { ...KOSICE_DEFAULT, accuracy: "default" };
  }

  const now = Date.now();
  if (cachedLocation && now - cachedAt < LOCATION_CACHE_MS) {
    return cachedLocation;
  }

  if ("geolocation" in navigator && now >= gpsRetryAfter) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 4500,
          maximumAge: LOCATION_CACHE_MS,
          enableHighAccuracy: false,
        });
      });
      cachedLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: "gps" };
      cachedAt = now;
      return cachedLocation;
    } catch {
      gpsRetryAfter = now + GPS_RETRY_COOLDOWN_MS;
    }
  }

  try {
    const res = await fetch("/api/location", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const location = data.location;
      if (typeof location?.lat === "number" && typeof location?.lng === "number") {
        cachedLocation = {
          lat: location.lat,
          lng: location.lng,
          accuracy: (location.accuracy as UserCoords["accuracy"]) ?? "ip",
        };
        cachedAt = now;
        return cachedLocation;
      }
    }
  } catch {
    /* fall through */
  }

  cachedLocation = { lat: KOSICE_DEFAULT.lat, lng: KOSICE_DEFAULT.lng, accuracy: "default" };
  cachedAt = now;
  return cachedLocation;
}

// Haversine distance (km)
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return distanceKm(lat1, lng1, lat2, lng2) * 1000;
}
