import { test, expect, API_BASE } from './fixtures/apiFixture.js';

test.describe('API - Miembros (/api/members) - Refactorizado con Fixtures', () => {

  test('GET / - Debería retornar lista de miembros', async ({ requestAuth }) => {
    // Fíjate qué limpio queda el código: ya no nos preocupamos por inyectar el header
    const response = await requestAuth.get(`${API_BASE}/members`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('POST / - Debería crear un nuevo miembro (Happy Path)', async ({ requestAuth }) => {
    const newMemberData = {
      fullName: 'Socio Automatizado API',
      ci: '1234567-8',
      phone: '099123456',
      planType: 'Libre',
      planCost: 2000,
      active: true
    };

    const response = await requestAuth.post(`${API_BASE}/members`, {
      multipart: newMemberData 
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('_id');

    // CLEANUP
    const deleteRes = await requestAuth.delete(`${API_BASE}/members/${body._id}`);
    expect(deleteRes.status()).toBe(200);
  });

});
