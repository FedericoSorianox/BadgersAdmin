import { test, expect } from './fixtures/base.js';

test.describe('Módulo de Pagos (Cobranza) - E2E Core', () => {

  test.beforeEach(async ({ authenticatedPage, paymentsPage }) => {
    // Interceptamos la llamada de miembros/deudas que alimenta la pantalla de pagos
    await authenticatedPage.route('**/api/debts', route => {
      route.fulfill({ 
        json: [
          { _id: '1', memberName: 'Socio Moroso', totalAmount: 1000, status: 'pending' }
        ] 
      });
    });

    await paymentsPage.goto();
  });

  test('Debería cargar la vista de Control de Pagos y la pestaña de pendientes', async ({ paymentsPage, authenticatedPage }) => {
    await expect(paymentsPage.pageTitle).toBeVisible();
    await paymentsPage.filterPending();

    // Verificamos el dato mockeado
    await expect(authenticatedPage.getByText('Socio Moroso')).toBeVisible();
  });

  test('Debería poder buscar en la lista de pagos', async ({ paymentsPage, authenticatedPage }) => {
    await paymentsPage.searchPayment('Socio');
    await expect(authenticatedPage.getByText('Socio Moroso')).toBeVisible();

    await paymentsPage.searchPayment('Alguien que no existe');
    await expect(authenticatedPage.getByText('Socio Moroso')).toBeHidden();
  });

});
