import { test, expect, API_BASE } from './fixtures/apiFixture.js';

test.describe('API - Finanzas (/api/finance) - Refactorizado con Fixtures', () => {

  test('GET / - Debería retornar el resumen financiero', async ({ requestAuth }) => {
    const response = await requestAuth.get(`${API_BASE}/finance`);
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(typeof body).toBe('object');
  });

  test('POST /expenses - Debería registrar un gasto y luego eliminarlo', async ({ requestAuth }) => {
    const newExpense = {
      concept: 'Gasto de Prueba QA',
      amount: 150,
      category: 'Limpieza',
      date: new Date().toISOString()
    };

    const postRes = await requestAuth.post(`${API_BASE}/finance/expenses`, {
      data: newExpense
    });

    expect(postRes.status()).toBe(201);
    const expense = await postRes.json();
    expect(expense.concept).toBe('Gasto de Prueba QA');

    // CLEANUP
    if (expense._id) {
      const delRes = await requestAuth.delete(`${API_BASE}/finance/expenses/${expense._id}`);
      expect(delRes.status()).toBe(200);
    }
  });
});
