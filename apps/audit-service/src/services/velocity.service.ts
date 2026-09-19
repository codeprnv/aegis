import { ANOMALY_CONFIG } from '../config/index.js';

/**
 * Result structure of an impossible travel velocity evaluation.
 * Defined as a type alias to provide an implicit index signature compatible with
 * Prisma's recursive InputJsonValue type for metadata storage.
 */
export type VelocityEvaluationResult = {
  isAnomaly: boolean;
  distanceKm: number;
  deltaMinutes: number;
  velocityKmH: number;
  reason?:
    | 'IMPOSSIBLE_TRAVEL_EXCEEDED'
    | 'DAMPING_WINDOW_ACTIVE'
    | 'NORMAL_VELOCITY';
};

/**
 * Geographic coordinate pair with evaluation timestamp.
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
  timestamp: number; // Unix epoch millisecond timestamp
}

/**
 * High-precision spherical velocity and impossible-travel evaluation service.
 * Applies Haversine great-circle trigonometric equations to calculate distance
 * and velocity between geographical logins.
 */
export class VelocityService {
  private static readonly EARTH_RADIUS_KM = 6371;
  public static readonly MAX_JITTER_DISTANCE_KM =
    ANOMALY_CONFIG.MAX_JITTER_DISTANCE_KM;

  /**
   * Validates whether geographic coordinates fall within physical Earth bounds.
   *
   * @param lat - Latitude in degrees (-90 to 90)
   * @param lon - Longitude in degrees (-180 to 180)
   * @returns True if coordinates are valid numbers within Earth bounds
   */
  public isValidCoordinate(lat: number, lon: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  }

  /**
   * Calculates great-circle distance in kilometers between two latitude/longitude points
   * using the Haversine trigonometric formula.
   *
   * @param lat1 - Source latitude in degrees
   * @param lon1 - Source longitude in degrees
   * @param lat2 - Destination latitude in degrees
   * @param lon2 - Destination longitude in degrees
   * @returns Distance in kilometers, or 0 if coordinates are invalid
   */
  public calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    if (
      !this.isValidCoordinate(lat1, lon1) ||
      !this.isValidCoordinate(lat2, lon2)
    ) {
      return 0;
    }

    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const radLat1 = this.toRadians(lat1);
    const radLat2 = this.toRadians(lat2);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) *
        Math.sin(dLon / 2) *
        Math.cos(radLat1) *
        Math.cos(radLat2);

    // Clamp intermediate variable to [0, 1] to prevent floating-point rounding errors from producing NaN
    const safeA = Math.min(1, Math.max(0, a));
    const c = 2 * Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA));

    return VelocityService.EARTH_RADIUS_KM * c;
  }

  /**
   * Evaluates whether travel between two historical points represents impossible human travel.
   * Enforces a minimum time delta window (5 minutes) to avoid false positives caused by
   * cellular tower hopping.
   *
   * @param prev - Previous geographic point
   * @param curr - Current geographic point
   * @returns Detailed velocity evaluation result
   */
  public evaluateVelocity(
    prev: GeoPoint,
    curr: GeoPoint
  ): VelocityEvaluationResult {
    if (
      !this.isValidCoordinate(prev.latitude, prev.longitude) ||
      !this.isValidCoordinate(curr.latitude, curr.longitude)
    ) {
      return {
        isAnomaly: false,
        distanceKm: 0,
        deltaMinutes: 0,
        velocityKmH: 0,
        reason: 'NORMAL_VELOCITY',
      };
    }

    const distanceKm = this.calculateDistanceKm(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );

    const deltaMs = Math.abs(curr.timestamp - prev.timestamp);
    const deltaMinutes = deltaMs / (1000 * 60);

    // If zero or negative elapsed time, evaluate whether distance exceeds jitter radius
    if (deltaMinutes <= 0) {
      const isAnomaly = distanceKm > VelocityService.MAX_JITTER_DISTANCE_KM;
      return {
        isAnomaly,
        distanceKm: Math.round(distanceKm * 100) / 100,
        deltaMinutes: 0,
        velocityKmH: isAnomaly ? 999999 : 0,
        reason: isAnomaly
          ? 'IMPOSSIBLE_TRAVEL_EXCEEDED'
          : 'DAMPING_WINDOW_ACTIVE',
      };
    }

    const velocityKmH = distanceKm / (deltaMinutes / 60);

    // Bounded cellular tower hopping mitigation
    if (deltaMinutes < ANOMALY_CONFIG.VELOCITY_MIN_DELTA_MINUTES) {
      // Only forgive the velocity spike if the distance is attributable to IP/ISP jitter
      if (distanceKm <= VelocityService.MAX_JITTER_DISTANCE_KM) {
        return {
          isAnomaly: false,
          distanceKm: Math.round(distanceKm * 100) / 100,
          deltaMinutes: Math.round(deltaMinutes * 100) / 100,
          velocityKmH: Math.round(velocityKmH * 100) / 100,
          reason: 'DAMPING_WINDOW_ACTIVE',
        };
      }
      // If distance > 250km under 5 minutes, it is physically impossible. Fall through to anomaly detection.
    }

    const isAnomaly = velocityKmH > ANOMALY_CONFIG.VELOCITY_THRESHOLD_KM_H;

    return {
      isAnomaly,
      distanceKm: Math.round(distanceKm * 100) / 100,
      deltaMinutes: Math.round(deltaMinutes * 100) / 100,
      velocityKmH: Math.round(velocityKmH * 100) / 100,
      reason: isAnomaly ? 'IMPOSSIBLE_TRAVEL_EXCEEDED' : 'NORMAL_VELOCITY',
    };
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

export const velocityService = new VelocityService();
