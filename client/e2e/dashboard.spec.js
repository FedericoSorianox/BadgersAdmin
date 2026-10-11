import { test, expect } from './fixtures/base.js';

test.describe('Dashboard - Validaciones Core (Patrón POM & Fixtures)', () => {

  // Utilizamos nuestra fixture customizada 'mockedDashboardPage' que:
  // 1. Inyecta el Auth en localStorage
  // 2. Levanta el DashboardPage (POM)
  // 3. Aplica todos los Mocks de red antes de arrancar
  
  test('Debería renderizar las métricas principales (KPIs) correctamente basadas en los datos', async ({ page, mockedDashboardPage }) => {
    // Las validaciones de KPIs usan los locators encapsulados en el POM
    await expect(mockedDashboardPage.activeMembersCard).toBeVisible();
    await expect(mockedDashboardPage.inactiveMembersCard).toBeVisible();

    // Verificamos que los números mockeados aparezcan (1 socio activo)
    await expect(page.locator('text=1').first()).toBeVisible(); 
  });

  test('Debería abrir el modal de Socios Activos al hacer clic en su tarjeta', async ({ page, mockedDashboardPage }) => {
    // Interacciones semánticas gracias al POM
    await mockedDashboardPage.openActiveMembersModal();

    // Validamos el modal
    await expect(mockedDashboardPage.activeModalHeader).toBeVisible();
    await expect(page.getByText('Juan Perez')).toBeVisible();

    // Acción de Cierre
    await mockedDashboardPage.closeActiveModal();
    await expect(mockedDashboardPage.activeModalHeader).toBeHidden();
  });

  test('Debería poder buscar un producto en el modal de Stock', async ({ page, mockedDashboardPage }) => {
    await mockedDashboardPage.openStockModal();
    await expect(mockedDashboardPage.stockModalHeader).toBeVisible();

    // Verificamos producto mockeado
    await expect(page.getByText('Proteína')).toBeVisible();

    // Búsqueda encapsulada en el POM
    if (await mockedDashboardPage.searchInput.isVisible()) {
      await mockedDashboardPage.searchItem('Creatina'); 
      await expect(page.getByText('Proteína')).toBeHidden();
    }
  });

});
