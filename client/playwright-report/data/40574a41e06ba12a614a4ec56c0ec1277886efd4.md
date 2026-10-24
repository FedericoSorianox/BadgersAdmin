# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.js >> Dashboard - Validaciones Core (Patrón POM & Fixtures) >> Debería poder buscar un producto en el modal de Stock
- Location: e2e/dashboard.spec.js:32:3

# Error details

```
Error: expect(locator).toBeHidden() failed

Locator:  getByText('Proteína')
Expected: hidden
Received: visible
Timeout:  5000ms

Call log:
  - Expect "toBeHidden" getByText('Proteína') with timeout 5000ms
  - waiting for getByText('Proteína')
    14 × locator resolved to <td class="px-4 py-3 font-medium text-slate-700">Proteína</td>
       - unexpected value "visible"

```

```yaml
- cell "Proteína"
```

# Test source

```ts
  1  | import { test, expect } from './fixtures/base.js';
  2  | 
  3  | test.describe('Dashboard - Validaciones Core (Patrón POM & Fixtures)', () => {
  4  | 
  5  |   // Utilizamos nuestra fixture customizada 'mockedDashboardPage' que:
  6  |   // 1. Inyecta el Auth en localStorage
  7  |   // 2. Levanta el DashboardPage (POM)
  8  |   // 3. Aplica todos los Mocks de red antes de arrancar
  9  |   
  10 |   test('Debería renderizar las métricas principales (KPIs) correctamente basadas en los datos', async ({ page, mockedDashboardPage }) => {
  11 |     // Las validaciones de KPIs usan los locators encapsulados en el POM
  12 |     await expect(mockedDashboardPage.activeMembersCard).toBeVisible();
  13 |     await expect(mockedDashboardPage.inactiveMembersCard).toBeVisible();
  14 | 
  15 |     // Verificamos que los números mockeados aparezcan (1 socio activo)
  16 |     await expect(page.locator('text=1').first()).toBeVisible(); 
  17 |   });
  18 | 
  19 |   test('Debería abrir el modal de Socios Activos al hacer clic en su tarjeta', async ({ page, mockedDashboardPage }) => {
  20 |     // Interacciones semánticas gracias al POM
  21 |     await mockedDashboardPage.openActiveMembersModal();
  22 | 
  23 |     // Validamos el modal
  24 |     await expect(mockedDashboardPage.activeModalHeader).toBeVisible();
  25 |     await expect(page.getByText('Juan Perez')).toBeVisible();
  26 | 
  27 |     // Acción de Cierre
  28 |     await mockedDashboardPage.closeActiveModal();
  29 |     await expect(mockedDashboardPage.activeModalHeader).toBeHidden();
  30 |   });
  31 | 
  32 |   test('Debería poder buscar un producto en el modal de Stock', async ({ page, mockedDashboardPage }) => {
  33 |     await mockedDashboardPage.openStockModal();
  34 |     await expect(mockedDashboardPage.stockModalHeader).toBeVisible();
  35 | 
  36 |     // Verificamos producto mockeado
  37 |     await expect(page.getByText('Proteína')).toBeVisible();
  38 | 
  39 |     // Búsqueda encapsulada en el POM
  40 |     if (await mockedDashboardPage.searchInput.isVisible()) {
  41 |       await mockedDashboardPage.searchItem('Creatina'); 
> 42 |       await expect(page.getByText('Proteína')).toBeHidden();
     |                                                ^ Error: expect(locator).toBeHidden() failed
  43 |     }
  44 |   });
  45 | 
  46 | });
  47 | 
```