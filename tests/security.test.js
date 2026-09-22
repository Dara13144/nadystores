const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('--- Enterprise Security & Anti-DDoS Test Suite ---', () => {

  describe('1. Security Headers & Information Disclosure Protection', () => {
    it('should include strict security headers and hide X-Powered-By', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
      expect(res.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('2. Anti-Scanner & Malicious User-Agent Defense', () => {
    it('should immediately block malicious scanner user-agents (e.g. sqlmap)', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('User-Agent', 'sqlmap/1.5.2#stable');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('should block directory traversal and .env probe payloads', async () => {
      const res = await request(app)
        .get('/api/products?config=../../.env');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('BAD_REQUEST');
    });
  });

  describe('3. Authentication Security & Anti-Enumeration', () => {
    it('should return a generic error message for non-existent users to prevent email enumeration', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent_attacker_target_999@example.com',
          password: 'Password@123456'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('should reject weak passwords on registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test_weak_pass@example.com',
          username: 'testweakuser',
          password: '123' // too short, no uppercase/symbol
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Multi-tier Rate Limiting (429 JSON Schema)', () => {
    it('should return the exact 429 response structure when rate limit is exceeded', async () => {
      const email = `ratelimit_test_${Date.now()}@example.com`;
      let lastRes;

      // Send requests to hit the strict login rate limit
      for (let i = 0; i < 12; i++) {
        lastRes = await request(app)
          .post('/api/auth/login')
          .send({ email, password: 'WrongPassword@123' });
      }

      expect(lastRes.status).toBe(429);
      expect(lastRes.body).toEqual({
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please try again later.'
      });
    });
  });

  describe('5. Admin Endpoint Authorization', () => {
    it('should reject unauthorized access to admin security overview', async () => {
      const res = await request(app).get('/api/admin/security/overview');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('6. File Upload Security', () => {
    it('should reject disallowed file extensions or corrupt mime payloads', async () => {
      const res = await request(app)
        .post('/api/upload')
        .send({
          filename: 'exploit.php',
          data: 'data:application/x-php;base64,PD9waHAgcGhwaW5mbygpOyA/Pg=='
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

});
