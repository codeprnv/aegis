import {
  deriveDeviceFingerprint,
  parseDeviceInfo,
} from '../utils/device-parser.util';

describe('Device Parser Utility', () => {
  describe('parseDeviceInfo', () => {
    it('should correctly parse desktop user agents', () => {
      const macChromeUA =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

      const result = parseDeviceInfo(macChromeUA);

      expect(result.deviceType).toBe('desktop');
      expect(result.browserName).toBe('Chrome');
      expect(result.osName).toBe('Mac OS');
    });

    it('should correctly parse mobile user agents', () => {
      const iPhoneSafariUA =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1';

      const result = parseDeviceInfo(iPhoneSafariUA);

      expect(result.deviceType).toBe('mobile');
      expect(result.deviceName).toBe('iPhone');
      expect(result.osName).toBe('iOS');
      expect(result.browserName).toBe('Mobile Safari');
    });

    it('should return safe defaults when userAgent is missing or empty', () => {
      const result = parseDeviceInfo('');

      expect(result.deviceType).toBe('desktop');
      expect(result.browserName).toBeUndefined();
      expect(result.osName).toBeUndefined();
    });
  });

  describe('deriveDeviceFingerprint', () => {
    it('should return a 64-character SHA-256 hexadecimal hash', () => {
      const headers = {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24"',
      };

      const fingerprint = deriveDeviceFingerprint(headers);

      expect(fingerprint).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('should produce identical fingerprints for identical device headers', () => {
      const headersA = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua-platform': '"Windows"',
      };

      const headersB = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua-platform': '"Windows"',
      };

      expect(deriveDeviceFingerprint(headersA)).toBe(
        deriveDeviceFingerprint(headersB)
      );
    });

    it('should produce different fingerprints when physical device headers differ', () => {
      const desktopHeaders = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua-platform': '"Windows"',
      };

      const mobileHeaders = {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1)',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua-platform': '"iOS"',
      };

      expect(deriveDeviceFingerprint(desktopHeaders)).not.toBe(
        deriveDeviceFingerprint(mobileHeaders)
      );
    });

    it('should be network-independent and unaffected by IP address headers', () => {
      const headersWithIpA = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'accept-language': 'en-US,en;q=0.9',
        'x-forwarded-for': '203.0.113.195',
      };

      const headersWithIpB = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'accept-language': 'en-US,en;q=0.9',
        'x-forwarded-for': '198.51.100.42',
      };

      expect(deriveDeviceFingerprint(headersWithIpA)).toBe(
        deriveDeviceFingerprint(headersWithIpB)
      );
    });
  });
});
