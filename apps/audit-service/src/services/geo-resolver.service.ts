import { logger } from '@aegis/common';
import { redis } from '@aegis/database';
import { Reader, type ReaderModel } from '@maxmind/geoip2-node';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { ANOMALY_CONFIG } from '../config/index.js';
import {
  isPrivateOrBogonIp,
  normalizeIpAddress,
} from '../utils/bogon-filter.js';

/**
 * Normalized geolocation data structure returned by GeoIP providers.
 */
export interface GeoLocation {
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  as?: string;
}

/**
 * Runtime validation schema for IPinfo.io HTTPS fallback responses.
 */
const ipinfoResponseSchema = z.object({
  ip: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  loc: z.string().optional(), // "latitude,longitude"
  org: z.string().optional(),
  postal: z.string().optional(),
  timezone: z.string().optional(),
});

/**
 * Runtime validation schema for public IP discovery endpoints in local development.
 */
const ipifyDiscoverySchema = z.object({
  ip: z.string(),
});

const ipApiDiscoverySchema = z.object({
  query: z.string().optional(),
});

/**
 * Enterprise-grade Geolocation Resolver Service.
 *
 * Pipeline:
 * 1. Primary: Local MaxMind GeoLite2 (.mmdb) database reader (~1ms, infinite rate limit, SOC 2 compliant).
 * 2. Secondary Fallback: IPinfo.io (HTTPS with Redis Circuit Breaker against 429 Too Many Requests).
 * 3. 24-Hour Redis Caching: aegis:geo:ip:<ip> for distributed worker O(1) performance.
 * 4. Production Edge Guard: strictly prevents internal/bogon IPs from leaking server egress coordinates.
 */
export class GeoResolverService {
  private readonly dbPath: string;
  private readonly ipinfoToken: string;
  private maxmindReader: ReaderModel | null = null;
  private isReaderInitializing = false;
  private readerInitAttempted = false;

  constructor(options?: { dbPath?: string; ipinfoToken?: string }) {
    this.dbPath =
      options?.dbPath ||
      path.resolve(process.cwd(), ANOMALY_CONFIG.MAXMIND_DB_PATH);
    this.ipinfoToken =
      options?.ipinfoToken || ANOMALY_CONFIG.IPINFO_TOKEN || '';
  }

  /**
   * Lazily initializes and returns the MaxMind GeoLite2 database reader singleton.
   * Gracefully falls back if the .mmdb database file is not yet downloaded or mounted.
   */
  private async getReader(): Promise<ReaderModel | null> {
    if (this.maxmindReader) {
      return this.maxmindReader;
    }

    if (this.readerInitAttempted) {
      return null;
    }

    if (this.isReaderInitializing) {
      // Wait briefly if initialization is concurrently in progress
      await new Promise((resolve) => setTimeout(resolve, 50));
      return this.maxmindReader;
    }

    this.isReaderInitializing = true;
    try {
      if (!fs.existsSync(this.dbPath)) {
        logger.warn(
          { dbPath: this.dbPath },
          'MaxMind GeoLite2 database file not found; GeoResolver operating in fallback mode'
        );
        this.readerInitAttempted = true;
        return null;
      }

      this.maxmindReader = await Reader.open(this.dbPath);
      logger.info(
        { dbPath: this.dbPath },
        'MaxMind GeoLite2 database reader loaded successfully'
      );
      return this.maxmindReader;
    } catch (err: unknown) {
      logger.error(
        {
          dbPath: this.dbPath,
          error: err instanceof Error ? err.message : String(err),
        },
        'Failed to initialize MaxMind GeoLite2 database reader'
      );
      this.readerInitAttempted = true;
      return null;
    } finally {
      this.isReaderInitializing = false;
    }
  }

  /**
   * Resolves geolocation coordinates and ISP metadata for a given IP address.
   *
   * @param rawIp - Target IP address (IPv4 or IPv6)
   * @returns Normalized GeoLocation or null if resolution fails
   */
  public async resolve(rawIp?: string | null): Promise<GeoLocation | null> {
    const cleanIp = normalizeIpAddress(rawIp);
    if (!cleanIp) {
      return null;
    }

    // Step 1: Check if IP is private/loopback/Docker
    if (isPrivateOrBogonIp(cleanIp)) {
      // In production, internal/bogon IPs must never trigger server egress discovery
      if (process.env.NODE_ENV === 'production') {
        return {
          ip: cleanIp,
          city: 'Internal Network',
          country: 'Internal',
          latitude: undefined,
          longitude: undefined,
        };
      }
      return this.resolveLocalDevPublicLocation(cleanIp);
    }

    // Step 2: Check Redis 24-hour cache
    const cacheKey = `aegis:geo:ip:${cleanIp}`;
    try {
      const cached = await redis.get<GeoLocation | string>(cacheKey);
      if (cached) {
        return typeof cached === 'string'
          ? (JSON.parse(cached) as GeoLocation)
          : cached;
      }
    } catch (err: unknown) {
      logger.warn(
        {
          ip: cleanIp,
          error: err instanceof Error ? err.message : String(err),
        },
        'Redis cache lookup failed for GeoIP; proceeding to resolution pipeline'
      );
    }

    // Step 3: Primary Resolver — Local MaxMind GeoLite2 Database
    let location = await this.resolveLocalMaxMind(cleanIp);

    // Step 4: Secondary Fallback — IPinfo.io with Circuit Breaker
    if (
      !location ||
      location.latitude === undefined ||
      location.longitude === undefined
    ) {
      location = await this.resolveIpinfoFallback(cleanIp);
    }

    // Step 5: Cache resolved location in Redis
    if (location) {
      try {
        await redis.setex(
          cacheKey,
          ANOMALY_CONFIG.GEO_CACHE_TTL_SECONDS,
          JSON.stringify(location)
        );
      } catch (err: unknown) {
        logger.warn(
          {
            ip: cleanIp,
            error: err instanceof Error ? err.message : String(err),
          },
          'Failed to persist resolved GeoIP to Redis cache'
        );
      }
    }

    return location;
  }

  /**
   * Performs high-speed (~1ms) local database lookup against the MaxMind GeoLite2 .mmdb file.
   *
   * @param ip - Target routable IP address
   * @returns Resolved GeoLocation or null
   */
  private async resolveLocalMaxMind(ip: string): Promise<GeoLocation | null> {
    try {
      const reader = await this.getReader();
      if (!reader) {
        return null;
      }

      const cityRecord = reader.city(ip);
      if (!cityRecord) {
        return null;
      }

      const latitude = cityRecord.location?.latitude;
      const longitude = cityRecord.location?.longitude;

      if (latitude === undefined || longitude === undefined) {
        return null;
      }

      const country = cityRecord.country?.names?.en;
      const countryCode = cityRecord.country?.isoCode;
      const region = cityRecord.subdivisions?.[0]?.names?.en;
      const city = cityRecord.city?.names?.en;
      const timezone = cityRecord.location?.timeZone;

      return {
        ip,
        country,
        countryCode,
        region,
        city,
        latitude,
        longitude,
        timezone,
      };
    } catch (err: unknown) {
      // AddressNotFoundError is normal for unallocated or test IPs; log as debug
      logger.debug(
        { ip, error: err instanceof Error ? err.message : String(err) },
        'MaxMind local lookup did not resolve IP'
      );
      return null;
    }
  }

  /**
   * Queries IPinfo.io via HTTPS with an active Circuit Breaker against HTTP 429 rate limits.
   *
   * @param ip - Target routable IP address
   * @returns Resolved GeoLocation or null
   */
  private async resolveIpinfoFallback(ip: string): Promise<GeoLocation | null> {
    // Check Circuit Breaker before making outbound HTTP request
    try {
      const isCircuitBroken = await redis.get(
        ANOMALY_CONFIG.GEO_CIRCUIT_BREAKER_KEY
      );
      if (isCircuitBroken) {
        logger.warn(
          { ip },
          'External GeoIP circuit breaker active; skipping IPinfo fallback query'
        );
        return null;
      }
    } catch {
      // Ignore Redis error and continue
    }

    try {
      const tokenQuery = this.ipinfoToken
        ? `?token=${encodeURIComponent(this.ipinfoToken)}`
        : '';
      const url = `https://ipinfo.io/${encodeURIComponent(ip)}/json${tokenQuery}`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(ANOMALY_CONFIG.GEO_PROVIDER_TIMEOUT_MS),
      });

      // Circuit Breaker: trip for 60s upon receiving 429 Too Many Requests
      if (res.status === 429) {
        logger.warn(
          { ip, status: 429 },
          'IPinfo.io returned 429 Too Many Requests; tripping circuit breaker for 60 seconds'
        );
        try {
          await redis.setex(
            ANOMALY_CONFIG.GEO_CIRCUIT_BREAKER_KEY,
            ANOMALY_CONFIG.GEO_CIRCUIT_BREAKER_TTL_SECONDS,
            '1'
          );
        } catch {
          // Ignore Redis write error
        }
        return null;
      }

      if (!res.ok) {
        logger.warn(
          { ip, status: res.status },
          'IPinfo.io query failed with non-200 status code'
        );
        return null;
      }

      const rawJson = await res.json();
      const parsed = ipinfoResponseSchema.safeParse(rawJson);
      if (!parsed.success) {
        logger.warn(
          { ip, errors: parsed.error.flatten() },
          'Failed to parse IPinfo.io response schema'
        );
        return null;
      }

      const { data } = parsed;
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (data.loc && data.loc.includes(',')) {
        const [latStr, lonStr] = data.loc.split(',');
        const pLat = parseFloat(latStr.trim());
        const pLon = parseFloat(lonStr.trim());
        if (!isNaN(pLat) && !isNaN(pLon)) {
          latitude = pLat;
          longitude = pLon;
        }
      }

      return {
        ip,
        country: data.country,
        countryCode: data.country,
        region: data.region,
        city: data.city,
        latitude,
        longitude,
        timezone: data.timezone,
        as: data.org,
      };
    } catch (err: unknown) {
      logger.warn(
        { ip, error: err instanceof Error ? err.message : String(err) },
        'Secondary GeoIP fallback (IPinfo.io) request failed or timed out'
      );
      return null;
    }
  }

  /**
   * Discovers the public egress IP of the development host machine when localhost/bogon IP is supplied.
   *
   * @param localIp - Original bogon IP (e.g., 127.0.0.1)
   * @returns GeoLocation of host egress IP or safe fallback
   */
  private async resolveLocalDevPublicLocation(
    localIp: string
  ): Promise<GeoLocation> {
    const devCacheKey = 'aegis:geo:dev:public_location';
    try {
      const cached = await redis.get<GeoLocation | string>(devCacheKey);
      if (cached) {
        const parsed =
          typeof cached === 'string'
            ? (JSON.parse(cached) as GeoLocation)
            : cached;
        return { ...parsed, ip: localIp };
      }
    } catch {
      // Redis error ignored for dev fallback
    }

    let publicIp: string | null = null;

    // Step A: Discover public IP via api.ipify.org
    try {
      const ipifyRes = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(ANOMALY_CONFIG.GEO_PROVIDER_TIMEOUT_MS),
      });
      if (ipifyRes.ok) {
        const rawJson = await ipifyRes.json();
        const parsed = ipifyDiscoverySchema.safeParse(rawJson);
        if (parsed.success && !isPrivateOrBogonIp(parsed.data.ip)) {
          publicIp = parsed.data.ip;
        }
      }
    } catch {
      // Ignore and fallback
    }

    // Step B: Fallback discovery via ip-api.com
    if (!publicIp) {
      try {
        const ipApiRes = await fetch('http://ip-api.com/json/', {
          signal: AbortSignal.timeout(ANOMALY_CONFIG.GEO_PROVIDER_TIMEOUT_MS),
        });
        if (ipApiRes.ok) {
          const rawJson = await ipApiRes.json();
          const parsed = ipApiDiscoverySchema.safeParse(rawJson);
          if (
            parsed.success &&
            parsed.data.query &&
            !isPrivateOrBogonIp(parsed.data.query)
          ) {
            publicIp = parsed.data.query;
          }
        }
      } catch {
        // Offline dev fallback
      }
    }

    // Step C: If public IP discovered, resolve coordinates via MaxMind or IPinfo
    if (publicIp) {
      let resolved = await this.resolveLocalMaxMind(publicIp);
      if (!resolved || resolved.latitude === undefined) {
        resolved = await this.resolveIpinfoFallback(publicIp);
      }

      if (resolved) {
        try {
          await redis.setex(
            devCacheKey,
            ANOMALY_CONFIG.GEO_CACHE_TTL_SECONDS,
            JSON.stringify(resolved)
          );
        } catch {
          // Ignore
        }
        return { ...resolved, ip: localIp };
      }
    }

    // Safe offline fallback for local testing with undefined coordinates
    return {
      ip: localIp,
      city: 'Local Development',
      country: 'Localhost',
      latitude: undefined,
      longitude: undefined,
    };
  }
}

export const geoResolverService = new GeoResolverService();
