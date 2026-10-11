import { test, expect } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:5001/api';

test.describe('API - Productos (/api/products)', () => {
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

  test('GET / - Debería retornar inventario de productos', async ({ request }) => {
    test.skip(!authToken, 'No auth token');
    const response = await request.get(`${API_BASE}/products`, {
      headers: { 'x-auth-token': authToken }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('POST / - Debería crear un producto nuevo (multipart/form-data)', async ({ request }) => {
    test.skip(!authToken, 'No auth token');
    const productData = {
      name: 'Producto QA Test',
      costPrice: 100,
      salePrice: 200,
      stock: 50,
      category: 'Suplementos'
    };

    const postRes = await request.post(`${API_BASE}/products`, {
      headers: { 'x-auth-token': authToken },
      multipart: productData 
    });

    // Validamos creación
    expect(postRes.status()).toBe(201);
    const product = await postRes.json();
    expect(product.name).toBe('Producto QA Test');

    // CLEANUP
    const delRes = await request.delete(`${API_BASE}/products/${product._id}`, {
      headers: { 'x-auth-token': authToken }
    });
    expect(delRes.status()).toBe(200);
  });
});
