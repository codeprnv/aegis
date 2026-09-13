import { hashTokenSHA256 } from '@aegis/common';
import { UAParser } from 'ua-parser-js';

/*
 ** Normalized representation of client device, operating system and browser telemetry
 */

export interface ParsedDeviceInfo {
  deviceType: string;
  deviceName?: string | undefined;
  osName?: string | undefined;
  osVersion?: string | undefined;
  browserName?: string | undefined;
  browserVersion?: string | undefined;
}

/* 
** Parses an HTTP User-Agent string into normalized device,
operating system, and browser metadata
*/

export const parseDeviceInfo = (userAgent?: string): ParsedDeviceInfo => {
    const parser = new UAParser(userAgent || '');
    const result = parser.getResult();

    return {
        deviceType: result.device.type || 'desktop',
        deviceName: result.device.model || undefined,
        osName: result.os.name || undefined,
        osVersion: result.os.version || undefined,
        browserName: result.browser.name || undefined,
        browserVersion: result.browser.version || undefined,
    }
}

export const deriveDeviceFingerprint = (headers: Record<string, string | string[] | undefined> = {}): string => {
    const getHeader = (name: string): string => {
        const val = headers[name] ?? headers[name.toLowerCase()];
        return Array.isArray(val) ? val.join(',') : val || '';
    };

    const staticPayload = [
        getHeader('user-agent'),
        getHeader('accept-language'),
        getHeader('sec-ch-ua-platform'),
        getHeader('sec-ch-ua')
    ].join('|');

    return hashTokenSHA256(staticPayload);
} 