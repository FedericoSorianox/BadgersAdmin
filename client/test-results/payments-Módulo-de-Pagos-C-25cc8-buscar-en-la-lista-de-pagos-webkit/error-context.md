# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payments.spec.js >> Módulo de Pagos (Cobranza) - E2E Core >> Debería poder buscar en la lista de pagos
- Location: e2e/payments.spec.js:26:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByPlaceholder(/Buscar/i)

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - region "Notifications alt+T"
  - generic [ref=f1e4]:
    - generic [ref=f1e5]:
      - img "Logo" [ref=f1e7]
      - heading "Bienvenido" [level=1] [ref=f1e8]
      - paragraph [ref=f1e9]: Panel de Administración
    - generic [ref=f1e11]:
      - generic [ref=f1e12]:
        - generic [ref=f1e13]: Usuario
        - textbox "Usuario" [ref=f1e18]: admin
      - generic [ref=f1e19]:
        - generic [ref=f1e20]: Contraseña
        - textbox "••••••••" [active] [ref=f1e25]
      - button "Ingresar al Panel" [ref=f1e26]
    - paragraph [ref=f1e28]: © 2025 Powered by MultiTenant SaaS
```

# Test source

```ts
  1  | export class PaymentsPage {
  2  |   /**
  3  |    * @param {import('@playwright/test').Page} page
  4  |    */
  5  |   constructor(page) {
  6  |     this.page = page;
  7  | 
  8  |     // Locators principales
  9  |     this.pageTitle = page.getByRole('heading', { name: /Control de Pagos/i });
  10 |     this.searchInput = page.getByPlaceholder(/Buscar/i);
  11 |     this.pendingTab = page.locator('text=Pendientes de Pago');
  12 |   }
  13 | 
  14 |   async goto() {
  15 |     await this.page.goto('/payments');
  16 |   }
  17 | 
  18 |   async searchPayment(term) {
> 19 |     await this.searchInput.fill(term);
     |                            ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  20 |   }
  21 | 
  22 |   async filterPending() {
  23 |     await this.pendingTab.click();
  24 |   }
  25 | }
  26 | 
```