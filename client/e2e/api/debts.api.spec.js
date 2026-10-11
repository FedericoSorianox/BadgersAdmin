import { test, expect } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:5001/api';

test.describe('API - Deudas (/api/debts)', () => {
  let authToken = '';

  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { username: 'superadmin', password: 'superpassword123' }
    });
    if (loginRes.ok()) {
      const body = await loginRes.json();
      authToken = body.token;
    }
  });

  test('GET / - Debería obtener deudas pendientes', async ({ request }) => {
    test.skip(!authToken, 'No auth token');
    const response = await request.get(`${API_BASE}/debts`, {
      headers: { 'x-auth-token': authToken }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });
});
