import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import jwt from 'jsonwebtoken';
import { generateInternalToken, verifyInternalToken } from '../internal-token.js';
import * as assert from 'assert';

console.log('Running internal token verification tests...');

const mockPayload = { sub: 'test-user', role: 'admin' };
const mockAudience = 'test-service';

// Test 1: should successfully sign and verify a valid RS256 token
try {
  const token = generateInternalToken(mockPayload, mockAudience);
  const decoded = verifyInternalToken(token, mockAudience);
  assert.strictEqual(decoded.sub, mockPayload.sub);
  assert.strictEqual(decoded.role, mockPayload.role);
  assert.strictEqual(decoded.aud, mockAudience);
  console.log('Test 1 passed: Successfully signed and verified a valid RS256 token');
} catch (e) {
  console.error('Test 1 failed', e);
  process.exit(1);
}

// Test 2: should fail verification if audience does not match
try {
  const token = generateInternalToken(mockPayload, 'another-service');
  assert.throws(() => {
    verifyInternalToken(token, mockAudience);
  }, /Invalid internal token/);
  console.log('Test 2 passed: Failed verification if audience does not match');
} catch (e) {
  console.error('Test 2 failed', e);
  process.exit(1);
}

// Test 3: should fail verification if token is signed with a different key
try {
  const fakeKey = process.env.TEST_INTERNAL_JWT_PRIVATE_KEY_B64 
      ? Buffer.from(process.env.TEST_INTERNAL_JWT_PRIVATE_KEY_B64, 'base64').toString('utf-8')
      : 'fallback-fake-key';

  const maliciousToken = jwt.sign(mockPayload, fakeKey, {
    algorithm: 'RS256',
    audience: mockAudience,
    issuer: 'aegis-gateway',
  });

  assert.throws(() => {
    verifyInternalToken(maliciousToken, mockAudience);
  }, /Invalid internal token/);
  console.log('Test 3 passed: Failed verification if token is signed with a different key');
} catch (e) {
  console.error('Test 3 failed', e);
  process.exit(1);
}

// Test 4: should fail verification if algorithm is changed to HS256
try {
  const maliciousToken = jwt.sign(mockPayload, 'some-secret-string', {
    algorithm: 'HS256',
    audience: mockAudience,
    issuer: 'aegis-gateway',
  });

  assert.throws(() => {
    verifyInternalToken(maliciousToken, mockAudience);
  }, /Invalid internal token/);
  console.log('Test 4 passed: Failed verification if algorithm is changed to HS256');
} catch (e) {
  console.error('Test 4 failed', e);
  process.exit(1);
}

console.log('All tests passed!');
