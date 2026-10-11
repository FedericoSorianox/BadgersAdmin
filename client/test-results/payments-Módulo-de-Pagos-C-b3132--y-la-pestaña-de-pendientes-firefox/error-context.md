# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payments.spec.js >> Módulo de Pagos (Cobranza) - E2E Core >> Debería cargar la vista de Control de Pagos y la pestaña de pendientes
- Location: e2e/payments.spec.js:18:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Control de Pagos/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: /Control de Pagos/i }) with timeout 5000ms
  - waiting for getByRole('heading', { name: /Control de Pagos/i })

```

```yaml
- region "Notifications alt+T"
- img "Logo"
- heading "Bienvenido" [level=1]
- paragraph: Panel de Administración
- text: Usuario
- textbox "Usuario": admin
- text: Contraseña
- textbox "••••••••"
- button "Ingresar al Panel"
- paragraph: © 2025 Powered by MultiTenant SaaS
```

# Test source

```ts
  1  | import { test, expect } from './fixtures/base.js';
  2  | 
  3  | test.describe('Módulo de Pagos (Cobranza) - E2E Core', () => {
  4  | 
  5  |   test.beforeEach(async ({ authenticatedPage, paymentsPage }) => {
  6  |     // Interceptamos la llamada de miembros/deudas que alimenta la pantalla de pagos
  7  |     await authenticatedPage.route('**/api/debts', route => {
  8  |       route.fulfill({ 
  9  |         json: [
  10 |           { _id: '1', memberName: 'Socio Moroso', totalAmount: 1000, status: 'pending' }
  11 |         ] 
  12 |       });
  13 |     });
  14 | 
  15 |     await paymentsPage.goto();
  16 |   });
  17 | 
  18 |   test('Debería cargar la vista de Control de Pagos y la pestaña de pendientes', async ({ paymentsPage, authenticatedPage }) => {
> 19 |     await expect(paymentsPage.pageTitle).toBeVisible();
     |                                          ^ Error: expect(locator).toBeVisible() failed
  20 |     await paymentsPage.filterPending();
  21 | 
  22 |     // Verificamos el dato mockeado
  23 |     await expect(authenticatedPage.getByText('Socio Moroso')).toBeVisible();
  24 |   });
  25 | 
  26 |   test('Debería poder buscar en la lista de pagos', async ({ paymentsPage, authenticatedPage }) => {
  27 |     await paymentsPage.searchPayment('Socio');
  28 |     await expect(authenticatedPage.getByText('Socio Moroso')).toBeVisible();
  29 | 
  30 |     await paymentsPage.searchPayment('Alguien que no existe');
  31 |     await expect(authenticatedPage.getByText('Socio Moroso')).toBeHidden();
  32 |   });
  33 | 
  34 | });
  35 | 
```