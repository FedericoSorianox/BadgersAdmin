# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: members.spec.js >> Módulo de Socios (Members) - E2E Core >> Debería cargar la tabla de socios correctamente
- Location: e2e/members.spec.js:24:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Carlos Santana')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Carlos Santana') with timeout 5000ms
  - waiting for getByText('Carlos Santana')

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
  3  | test.describe('Módulo de Socios (Members) - E2E Core', () => {
  4  | 
  5  |   // Al usar la fixture 'authenticatedPage', evitamos la pantalla de login.
  6  |   test.beforeEach(async ({ authenticatedPage, membersPage }) => {
  7  |     // Simulamos la respuesta de la red para aislar el frontend (Test de Componente E2E)
  8  |     // De lo contrario, necesitaríamos que el backend devuelva socios reales.
  9  |     await authenticatedPage.route('**/api/members', route => {
  10 |       if (route.request().method() === 'GET') {
  11 |         route.fulfill({ 
  12 |           json: [
  13 |             { _id: '1', fullName: 'Carlos Santana', ci: '1234567-8', active: true, planType: 'Libre' }
  14 |           ] 
  15 |         });
  16 |       } else if (route.request().method() === 'POST') {
  17 |         route.fulfill({ status: 201, json: { _id: '2', fullName: 'Socio Nuevo' } });
  18 |       }
  19 |     });
  20 | 
  21 |     await membersPage.goto();
  22 |   });
  23 | 
  24 |   test('Debería cargar la tabla de socios correctamente', async ({ authenticatedPage }) => {
  25 |     // Validamos que el socio mockeado esté en la pantalla
> 26 |     await expect(authenticatedPage.getByText('Carlos Santana')).toBeVisible();
     |                                                                 ^ Error: expect(locator).toBeVisible() failed
  27 |     await expect(authenticatedPage.getByText('1234567-8')).toBeVisible();
  28 |   });
  29 | 
  30 |   test('Debería abrir el modal para agregar un nuevo socio y poder llenarlo', async ({ authenticatedPage, membersPage }) => {
  31 |     await membersPage.openNewMemberModal();
  32 | 
  33 |     // Verificamos que el modal se abrió
  34 |     await expect(membersPage.modalHeader).toBeVisible();
  35 | 
  36 |     // Llenamos el formulario usando la abstracción
  37 |     await membersPage.fillNewMemberForm({
  38 |       fullName: 'Socio Nuevo',
  39 |       ci: '9876543-2'
  40 |     });
  41 | 
  42 |     // Guardamos
  43 |     await membersPage.submitForm();
  44 | 
  45 |     // Si tu app muestra un toast o cierra el modal, lo validamos aquí
  46 |     // await expect(membersPage.modalHeader).toBeHidden(); 
  47 |   });
  48 | 
  49 |   test('Debería poder buscar un socio específico', async ({ authenticatedPage, membersPage }) => {
  50 |     await membersPage.searchMember('Santana');
  51 |     await expect(authenticatedPage.getByText('Carlos Santana')).toBeVisible();
  52 |   });
  53 | 
  54 | });
  55 | 
```