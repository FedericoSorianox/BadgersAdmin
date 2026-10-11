import { test, expect } from './fixtures/base.js';

test.describe('Módulo de Finanzas (Gastos e Ingresos) - E2E Core', () => {

  test.beforeEach(async ({ authenticatedPage, financesPage }) => {
    // Interceptamos la red para aislar la prueba del backend real
    await authenticatedPage.route('**/api/finance', route => {
      route.fulfill({ 
        json: {
          incomes: [],
          expenses: [{ _id: '1', concept: 'Internet', amount: 1500, category: 'Gasto' }],
          balance: -1500
        }
      });
    });

    await authenticatedPage.route('**/api/finance/expenses', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 201, json: { _id: '2', concept: 'Gasto Test' } });
      }
    });

    await financesPage.goto();
  });

  test('Debería cargar la tabla de finanzas con los gastos mockeados', async ({ authenticatedPage }) => {
    // Verificamos que el concepto mockeado se renderice
    await expect(authenticatedPage.getByText('Internet')).toBeVisible();
    await expect(authenticatedPage.getByText('1500')).toBeVisible();
  });

  test('Debería abrir el modal de Nuevo Gasto y permitir guardarlo', async ({ financesPage }) => {
    await financesPage.openNewExpenseModal();
    await expect(financesPage.expenseModalHeader).toBeVisible();

    await financesPage.fillExpenseForm({
      amount: 500
    });

    await financesPage.submitExpense();
  });

});
