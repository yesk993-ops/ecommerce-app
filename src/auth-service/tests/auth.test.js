const request = require('supertest');

describe('Auth Service', () => {
  test('health endpoint returns UP', async () => {
    const response = await request('http://localhost:4001').get('/api/auth/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('UP');
  });

  test('register rejects missing fields', async () => {
    const response = await request('http://localhost:4001').post('/api/auth/register').send({});
    expect(response.status).toBe(400);
  });
});
