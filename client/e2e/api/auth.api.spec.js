import { test, expect } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:5001/api';

test.describe('API - Autenticación (/api/auth)', () => {

  // TEST 1: Happy Path - Login Exitoso
  // En un entorno de CI real, la BD debe inicializarse con un usuario de prueba (ej: testadmin / 123456)
  test('POST /login - Debería retornar token JWT con credenciales válidas', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/login`, {
      data: {
        username: 'superadmin',
        password: 'superpassword123'
      }
    });

    // Validaciones de Arquitectura QA:
    // 1. Validar el Status Code (200 OK)
    // Usamos expect.soft() para que si falla, siga mostrando el body (muy útil para debuggear)
    expect.soft(response.status()).toBe(200);

    // 2. Si es 200, validar la estructura de la respuesta (Contrato API)
    if (response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('user');
      expect(body.user).toHaveProperty('role', 'superadmin');
    }
  });

  // TEST 2: Unhappy Path - Credenciales Inválidas
  test('POST /login - Debería retornar 400/401 con credenciales inválidas', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/login`, {
      data: {
        username: 'admin',
        password: 'wrongpassword'
      }
    });

    // Validamos que NO permita el acceso (generalmente 400 o 401 dependiendo de tu implementación)
    expect(response.status()).toBeGreaterThanOrEqual(400);

    const body = await response.json();
    expect(body).toHaveProperty('message'); // Asumiendo que el backend envía { message: '...' }
  });

  // TEST 3: Seguridad - Endpoint Protegido SIN Token
  test('GET /user - Debería rechazar petición sin token (401)', async ({ request }) => {
    // Hacemos un GET a la ruta protegida sin enviar cabeceras
    const response = await request.get(`${API_BASE}/auth/user`);

    expect(response.status()).toBe(401); // 401 Unauthorized
  });

});
