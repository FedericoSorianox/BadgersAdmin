# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: finances.spec.js >> Módulo de Finanzas (Gastos e Ingresos) - E2E Core >> Debería abrir el modal de Nuevo Gasto y permitir guardarlo
- Location: e2e/finances.spec.js:32:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Nuevo Gasto/i })
    - waiting for "http://localhost:5173/login" navigation to finish...
    - navigated to "http://localhost:5173/login"

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
  1  | export class FinancesPage {
  2  |   /**
  3  |    * @param {import('@playwright/test').Page} page
  4  |    */
  5  |   constructor(page) {
  6  |     this.page = page;
  7  | 
  8  |     // Locators principales
  9  |     this.newExpenseBtn = page.getByRole('button', { name: /Nuevo Gasto/i });
  10 |     this.newSaleBtn = page.getByRole('button', { name: /Nueva Venta/i });
  11 |     
  12 |     // Elementos del Modal de Nuevo Gasto
  13 |     this.expenseModalHeader = page.getByRole('heading', { name: /Nuevo Gasto/i });
  14 |     this.expenseConceptInput = page.getByPlaceholder(/Concepto/i).or(page.locator('input[name="concept"]')).or(page.locator('select'));
  15 |     this.expenseAmountInput = page.getByPlaceholder(/Monto/i).or(page.locator('input[type="number"]'));
  16 |     this.expenseSaveBtn = page.getByRole('button', { name: /Guardar/i });
  17 |   }
  18 | 
  19 |   async goto() {
  20 |     await this.page.goto('/finances');
  21 |   }
  22 | 
  23 |   async openNewExpenseModal() {
> 24 |     await this.newExpenseBtn.click();
     |                              ^ Error: locator.click: Test timeout of 30000ms exceeded.
  25 |   }
  26 | 
  27 |   async fillExpenseForm(data) {
  28 |     if (data.amount) {
  29 |       await this.expenseAmountInput.fill(data.amount.toString());
  30 |     }
  31 |   }
  32 | 
  33 |   async submitExpense() {
  34 |     await this.expenseSaveBtn.click();
  35 |   }
  36 | }
  37 | 
```