import { generateInternalToken, verifyInternalToken } from '@aegis/common';
const jwt = require('jsonwebtoken');

const TEST_SECRET = 'fallback-internal-secret-do-not-use-in-prod';

beforeAll(() => {
  process.env.INTERNAL_JWT_SECRET = TEST_SECRET;
});

describe('Internal Token - Validation Tests', () => {
  const validPayload = { sub: 'user-123', role: 'user' };
  const validAudience = 'profile-service';

  describe('✅ Valid Token scenarios', () => {
    it('should verify the audience and give decoded value', () => {
      const token = generateInternalToken(validPayload, validAudience);
      const decoded = verifyInternalToken(token, validAudience);

      expect(decoded.sub).toBe(validPayload.sub);
      expect(decoded.role).toBe(validPayload.role);
    });

    it('should verify the issuer to be gateway', () => {
      const token = generateInternalToken(validPayload, validAudience);
      const decoded = jwt.decode(token);

      expect(decoded.iss).toBe('aegis-gateway');
    });
  });

  describe('Direct Service Access (Missing token)', () => {
    it('should reject the missing token', () => {
      expect(() => verifyInternalToken('', validAudience)).toThrow(
        'Invalid internal token'
      );
    });

    it('should throw when the token in malformed', () => {
      expect(() =>
        verifyInternalToken('malformed-token', validAudience)
      ).toThrow('Invalid internal token');
    });
  });

  describe("Forged Token (Attacker's Secret)", () => {
    const forgedToken = jwt.sign(validPayload, 'attacker-secret', {
      issuer: 'aegis-gateway',
      audience: validAudience,
      expiresIn: '1m',
    });
    it('should reject the forged token with attacker secret', () => {
      expect(() => verifyInternalToken(forgedToken, validAudience)).toThrow(
        'Invalid internal token'
      );
    });
  });

  describe('Expired Token', () => {
    it('should reject the expired token', () => {
      const expiredToken = jwt.sign(validPayload, TEST_SECRET, {
        issuer: 'aegis-gateway',
        audience: validAudience,
        expiresIn: '-10s',
      });
      expect(() => verifyInternalToken(expiredToken, validAudience)).toThrow(
        'Invalid internal token'
      );
    });
  });

  describe('Token use on wrong audience', () => {
    const token = generateInternalToken(validPayload, validAudience);

    it('should reject the token with wrong audience', () => {
      expect(() => verifyInternalToken(token, 'wrong-audience')).toThrow(
        'Invalid internal token'
      );
    });
  });

  describe('Token use on wrong issuer', () => {
    it('should reject the token with wrong issuer', () => {
      const token = jwt.sign(validPayload, TEST_SECRET, {
        issuer: 'wrong-issuer',
        audience: validAudience,
        expiresIn: '1m',
      });
      expect(() => verifyInternalToken(token, validAudience)).toThrow(
        'Invalid internal token'
      );
    });
  });

  describe('Algorithm confusion attack', () => {
    it('should reject the token with wrong algorithm', () => {
      const token = jwt.sign(validPayload, TEST_SECRET, {
        algorithm: 'HS384',
        issuer: 'aegis-gateway',
        audience: validAudience,
        expiresIn: '1m',
      });
      expect(() => verifyInternalToken(token, validAudience)).toThrow(
        'Invalid internal token'
      );
    });
  });
});
