# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: finances.spec.js >> Módulo de Finanzas (Gastos e Ingresos) - E2E Core >> Debería cargar la tabla de finanzas con los gastos mockeados
- Location: e2e/finances.spec.js:26:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Internet')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Internet') with timeout 5000ms
  - waiting for getByText('Internet')
    - waiting for "http://localhost:5173/login" navigation to finish...
    - navigated to "http://localhost:5173/login"

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
  3  | test.describe('Módulo de Finanzas (Gastos e Ingresos) - E2E Core', () => {
  4  | 
  5  |   test.beforeEach(async ({ authenticatedPage, financesPage }) => {
  6  |     // Interceptamos la red para aislar la prueba del backend real
  7  |     await authenticatedPage.route('**/api/finance', route => {
  8  |       route.fulfill({ 
  9  |         json: {
  10 |           incomes: [],
  11 |           expenses: [{ _id: '1', concept: 'Internet', amount: 1500, category: 'Gasto' }],
  12 |           balance: -1500
  13 |         }
  14 |       });
  15 |     });
  16 | 
  17 |     await authenticatedPage.route('**/api/finance/expenses', route => {
  18 |       if (route.request().method() === 'POST') {
  19 |         route.fulfill({ status: 201, json: { _id: '2', concept: 'Gasto Test' } });
  20 |       }
  21 |     });
  22 | 
  23 |     await financesPage.goto();
  24 |   });
  25 | 
  26 |   test('Debería cargar la tabla de finanzas con los gastos mockeados', async ({ authenticatedPage }) => {
  27 |     // Verificamos que el concepto mockeado se renderice
> 28 |     await expect(authenticatedPage.getByText('Internet')).toBeVisible();
     |                                                           ^ Error: expect(locator).toBeVisible() failed
  29 |     await expect(authenticatedPage.getByText('1500')).toBeVisible();
  30 |   });
  31 | 
  32 |   test('Debería abrir el modal de Nuevo Gasto y permitir guardarlo', async ({ financesPage }) => {
  33 |     await financesPage.openNewExpenseModal();
  34 |     await expect(financesPage.expenseModalHeader).toBeVisible();
  35 | 
  36 |     await financesPage.fillExpenseForm({
  37 |       amount: 500
  38 |     });
  39 | 
  40 |     await financesPage.submitExpense();
  41 |   });
  42 | 
  43 | });
  44 | 
```