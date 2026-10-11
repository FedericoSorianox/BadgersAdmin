import { test as baseTest } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { MembersPage } from '../pages/MembersPage.js';
import { InventoryPage } from '../pages/InventoryPage.js';
import { FinancesPage } from '../pages/FinancesPage.js';
import { PaymentsPage } from '../pages/PaymentsPage.js';

// Extendemos el test base de Playwright para inyectar nuestros POMs y utilidades
export const test = baseTest.extend({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  membersPage: async ({ page }, use) => {
    await use(new MembersPage(page));
  },

  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },

  financesPage: async ({ page }, use) => {
    await use(new FinancesPage(page));
  },

  paymentsPage: async ({ page }, use) => {
    await use(new PaymentsPage(page));
  },

  // Fixture genérica para inyectar auth sin mockear red (usando backend real)
  authenticatedPage: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('isAuthenticated', 'true');
      window.localStorage.setItem('token', 'fake-jwt-token'); // Cambiar por token válido si el backend valida JWT
      window.localStorage.setItem('role', 'superadmin');
    });
    await use(page);
  },

  // Fixture avanzada: Carga el dashboard con Auth simulado y mocks de red
  mockedDashboardPage: async ({ page, dashboardPage }, use) => {
    // 1. Inyectamos estado de sesión
    await page.addInitScript(() => {
      window.localStorage.setItem('isAuthenticated', 'true');
      window.localStorage.setItem('token', 'fake-jwt-token-para-testing');
      window.localStorage.setItem('role', 'admin');
    });

    // 2. Preparamos las intercepciones de red
    await dashboardPage.setupNetworkMocks();

    // 3. Navegamos
    await dashboardPage.goto();

    // 4. Entregamos la página lista al test
    await use(dashboardPage);
  }
});

export { expect } from '@playwright/test';
