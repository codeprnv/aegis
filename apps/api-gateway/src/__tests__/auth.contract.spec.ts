jest.mock('@aegis/middlewares', () => ({
  ...jest.requireActual('@aegis/middlewares'),
  errorMiddleware: jest.fn((err: any, req: any, res: any, next: any) => next()),
  extractAuthContext: jest.fn((req: any, res: any, next: any) => next()),
  requireAuth: jest.fn((req: any, res: any, next: any) => next()),
  requireRole: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
import { createTestApp } from '../test-utils/test-app';

describe('API Gateway Auth Contracts', () => {
  const app = createTestApp();

  const JWT_SECRET = 'test-jwt-secret';

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  const createToken = (payload: { id: string; role: 'USER' | 'ADMIN' }) => {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '1h',
    });
  };

  describe('GET /me', () => {
    it('returns 401 when no token is provided', async () => {
      await request(app).get('/me').expect(401);
    });

    it('returns 200 for authenticated user', async () => {
      const token = createToken({ id: 'user-1', role: 'USER' });
      const res = await request(app)
        .get('/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body).toEqual({
        id: 'user-1',
        role: 'user',
      });
    });
  });
  describe('GET /admin', () => {
    it('returns 403 for authenticated non-admin user', async () => {
      const token = createToken({ id: 'user-1', role: 'USER' });

      await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('returns 200 for admin user', async () => {
      const token = createToken({ id: 'user-1', role: 'ADMIN' });

      await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
