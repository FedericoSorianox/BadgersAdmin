# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: members.spec.js >> Módulo de Socios (Members) - E2E Core >> Debería abrir el modal para agregar un nuevo socio y poder llenarlo
- Location: e2e/members.spec.js:30:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Nuevo Socio/i })

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
  1  | export class MembersPage {
  2  |   /**
  3  |    * @param {import('@playwright/test').Page} page
  4  |    */
  5  |   constructor(page) {
  6  |     this.page = page;
  7  | 
  8  |     // Locators principales
  9  |     this.newMemberBtn = page.getByRole('button', { name: /Nuevo Socio/i });
  10 |     this.searchInput = page.getByPlaceholder(/Buscar/i);
  11 |     
  12 |     // Elementos del Modal de Nuevo Socio
  13 |     this.modalHeader = page.getByRole('heading', { name: /Nuevo Socio/i });
  14 |     this.fullNameInput = page.getByPlaceholder(/Nombre completo/i).or(page.locator('input[name="fullName"]'));
  15 |     this.ciInput = page.getByPlaceholder(/Cédula/i).or(page.locator('input[name="ci"]'));
  16 |     this.saveBtn = page.getByRole('button', { name: /Guardar/i });
  17 |   }
  18 | 
  19 |   async goto() {
  20 |     await this.page.goto('/members');
  21 |   }
  22 | 
  23 |   async openNewMemberModal() {
> 24 |     await this.newMemberBtn.click();
     |                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  25 |   }
  26 | 
  27 |   async searchMember(name) {
  28 |     await this.searchInput.fill(name);
  29 |   }
  30 | 
  31 |   // Abstracción del llenado de formulario
  32 |   async fillNewMemberForm(memberData) {
  33 |     if (memberData.fullName) await this.fullNameInput.fill(memberData.fullName);
  34 |     if (memberData.ci) await this.ciInput.fill(memberData.ci);
  35 |     // Agregaremos más campos según sea necesario (teléfono, plan, etc)
  36 |   }
  37 | 
  38 |   async submitForm() {
  39 |     await this.saveBtn.click();
  40 |   }
  41 | }
  42 | 
```