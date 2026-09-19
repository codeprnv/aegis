import ipaddr from 'ipaddr.js';

/**
 * Strips transport wrappers (brackets, port numbers, zone indices) and pre-normalizes embedded IPv4 strings.
 *
 * @param rawIp - Raw IP string from socket or headers
 * @returns Sanitized IP string ready for parser evaluation
 */
function cleanAndCanonicalizeIp(rawIp?: string | null): string {
  if (!rawIp) return '';
  let s = rawIp.trim();

  // Strip enclosing brackets e.g. [::1] or [::1]:8080
  if (s.startsWith('[') && s.includes(']')) {
    const endBracket = s.indexOf(']');
    s = s.slice(1, endBracket);
  } else if (/^(\d+|0x[0-9a-f]+|\d+\.\d+\.\d+\.\d+):(\d+)$/i.test(s)) {
    // Strip IPv4 port suffix e.g. 1.2.3.4:8080
    s = s.split(':')[0];
  }

  // Strip IPv6 zone index e.g. fe80::1%eth0
  const zoneIdx = s.indexOf('%');
  if (zoneIdx !== -1) {
    s = s.slice(0, zoneIdx);
  }

  // Pre-normalize embedded IPv4 (e.g. ::ffff:012.0.0.1 -> ::ffff:10.0.0.1)
  const lastColon = s.lastIndexOf(':');
  if (lastColon !== -1 && s.slice(lastColon + 1).includes('.')) {
    const embeddedIpv4 = s.slice(lastColon + 1);
    if (ipaddr.isValid(embeddedIpv4)) {
      s = s.slice(0, lastColon + 1) + ipaddr.process(embeddedIpv4).toString();
    }
  }

  return s;
}

/**
 * Parses and canonicalizes an IP string, explicitly down-converting IPv4-mapped IPv6
 * addresses (e.g., ::ffff:8.8.8.8 or ::ffff:808:808) into pure IPv4 instances.
 * This prevents dual-stack sockets (AWS ALB, Docker) from blackholing legitimate public IPv4 traffic.
 *
 * @param rawIp - Raw IP string
 * @returns Parsed and normalized IPv4 or IPv6 instance, or null if malformed
 */
export function parseAndDownconvertIp(
  rawIp?: string | null
): ipaddr.IPv4 | ipaddr.IPv6 | null {
  const clean = cleanAndCanonicalizeIp(rawIp);
  if (!clean || !ipaddr.isValid(clean)) {
    return null;
  }

  try {
    const parsed = ipaddr.parse(clean);
    // Explicitly detect and down-convert dual-stack IPv4-mapped IPv6 addresses
    if (
      parsed.kind() === 'ipv6' &&
      (parsed as ipaddr.IPv6).isIPv4MappedAddress()
    ) {
      return (parsed as ipaddr.IPv6).toIPv4Address();
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Normalizes an IP address into its canonical string representation.
 * Resolves octal/hex notation, down-converts IPv4-mapped IPv6, and strips transport artifacts.
 *
 * @param rawIp - Raw IP string
 * @returns Canonical IP string or empty string if invalid
 */
export function normalizeIpAddress(rawIp?: string | null): string {
  const addr = parseAndDownconvertIp(rawIp);
  if (!addr) {
    return '';
  }
  return addr.toString();
}

/**
 * Evaluates whether an IP address belongs to any non-routable, private, loopback,
 * multicast, carrier-grade NAT, or bogon range according to RFC 6890 and IANA standards.
 * Purely evaluates down-converted IPv4 or native IPv6, avoiding IPv4-mapped false positives.
 *
 * @param ip - Raw IP string to evaluate
 * @returns True if the IP is private, bogon, or malformed; false if globally routable unicast
 */
export function isPrivateOrBogonIp(ip?: string | null): boolean {
  const addr = parseAndDownconvertIp(ip);
  if (!addr) {
    return true; // Malformed or empty is non-routable
  }

  // Pure IPv4 or native IPv6: evaluate range
  // Any range other than global 'unicast' is non-routable bogon/private/multicast/reserved
  return addr.range() !== 'unicast';
}
