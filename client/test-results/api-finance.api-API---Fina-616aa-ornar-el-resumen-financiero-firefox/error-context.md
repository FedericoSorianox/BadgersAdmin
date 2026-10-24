# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/finance.api.spec.js >> API - Finanzas (/api/finance) - Refactorizado con Fixtures >> GET / - Debería retornar el resumen financiero
- Location: e2e/api/finance.api.spec.js:5:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 403
```

# Test source

```ts
  1  | import { test, expect, API_BASE } from './fixtures/apiFixture.js';
  2  | 
  3  | test.describe('API - Finanzas (/api/finance) - Refactorizado con Fixtures', () => {
  4  | 
  5  |   test('GET / - Debería retornar el resumen financiero', async ({ requestAuth }) => {
  6  |     const response = await requestAuth.get(`${API_BASE}/finance`);
  7  |     
> 8  |     expect(response.status()).toBe(200);
     |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  9  |     const body = await response.json();
  10 |     expect(typeof body).toBe('object');
  11 |   });
  12 | 
  13 |   test('POST /expenses - Debería registrar un gasto y luego eliminarlo', async ({ requestAuth }) => {
  14 |     const newExpense = {
  15 |       concept: 'Gasto de Prueba QA',
  16 |       amount: 150,
  17 |       category: 'Limpieza',
  18 |       date: new Date().toISOString()
  19 |     };
  20 | 
  21 |     const postRes = await requestAuth.post(`${API_BASE}/finance/expenses`, {
  22 |       data: newExpense
  23 |     });
  24 | 
  25 |     expect(postRes.status()).toBe(201);
  26 |     const expense = await postRes.json();
  27 |     expect(expense.concept).toBe('Gasto de Prueba QA');
  28 | 
  29 |     // CLEANUP
  30 |     if (expense._id) {
  31 |       const delRes = await requestAuth.delete(`${API_BASE}/finance/expenses/${expense._id}`);
  32 |       expect(delRes.status()).toBe(200);
  33 |     }
  34 |   });
  35 | });
  36 | 
```