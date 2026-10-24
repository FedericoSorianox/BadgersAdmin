# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/auth.api.spec.js >> API - Autenticación (/api/auth) >> POST /login - Debería retornar token JWT con credenciales válidas
- Location: e2e/api/auth.api.spec.js:9:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 400
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const API_BASE = 'http://127.0.0.1:5001/api';
  4  | 
  5  | test.describe('API - Autenticación (/api/auth)', () => {
  6  | 
  7  |   // TEST 1: Happy Path - Login Exitoso
  8  |   // En un entorno de CI real, la BD debe inicializarse con un usuario de prueba (ej: testadmin / 123456)
  9  |   test('POST /login - Debería retornar token JWT con credenciales válidas', async ({ request }) => {
  10 |     const response = await request.post(`${API_BASE}/auth/login`, {
  11 |       data: {
  12 |         username: 'superadmin',
  13 |         password: 'superpassword123'
  14 |       }
  15 |     });
  16 | 
  17 |     // Validaciones de Arquitectura QA:
  18 |     // 1. Validar el Status Code (200 OK)
  19 |     // Usamos expect.soft() para que si falla, siga mostrando el body (muy útil para debuggear)
> 20 |     expect.soft(response.status()).toBe(200);
     |                                    ^ Error: expect(received).toBe(expected) // Object.is equality
  21 | 
  22 |     // 2. Si es 200, validar la estructura de la respuesta (Contrato API)
  23 |     if (response.ok()) {
  24 |       const body = await response.json();
  25 |       expect(body).toHaveProperty('token');
  26 |       expect(body).toHaveProperty('user');
  27 |       expect(body.user).toHaveProperty('role', 'superadmin');
  28 |     }
  29 |   });
  30 | 
  31 |   // TEST 2: Unhappy Path - Credenciales Inválidas
  32 |   test('POST /login - Debería retornar 400/401 con credenciales inválidas', async ({ request }) => {
  33 |     const response = await request.post(`${API_BASE}/auth/login`, {
  34 |       data: {
  35 |         username: 'admin',
  36 |         password: 'wrongpassword'
  37 |       }
  38 |     });
  39 | 
  40 |     // Validamos que NO permita el acceso (generalmente 400 o 401 dependiendo de tu implementación)
  41 |     expect(response.status()).toBeGreaterThanOrEqual(400);
  42 | 
  43 |     const body = await response.json();
  44 |     expect(body).toHaveProperty('message'); // Asumiendo que el backend envía { message: '...' }
  45 |   });
  46 | 
  47 |   // TEST 3: Seguridad - Endpoint Protegido SIN Token
  48 |   test('GET /user - Debería rechazar petición sin token (401)', async ({ request }) => {
  49 |     // Hacemos un GET a la ruta protegida sin enviar cabeceras
  50 |     const response = await request.get(`${API_BASE}/auth/user`);
  51 | 
  52 |     expect(response.status()).toBe(401); // 401 Unauthorized
  53 |   });
  54 | 
  55 | });
  56 | 
```