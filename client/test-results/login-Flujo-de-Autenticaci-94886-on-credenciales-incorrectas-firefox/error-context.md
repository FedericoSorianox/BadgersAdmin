# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.js >> Flujo de Autenticación (Login) - Patrón POM >> Debería mostrar un mensaje de error con credenciales incorrectas
- Location: e2e/login.spec.js:12:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Error de autenticación')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=Error de autenticación') with timeout 5000ms
  - waiting for locator('text=Error de autenticación')

```

```yaml
- region "Notifications alt+T"
- img "Logo"
- heading "Bienvenido" [level=1]
- paragraph: Panel de Administración
- text: Usuario
- textbox "Usuario": admin_falso
- text: Contraseña
- textbox "••••••••": clave_mala_123
- paragraph: User not found
- button "Ingresar al Panel"
- paragraph: © 2025 Powered by MultiTenant SaaS
```

# Test source

```ts
  1  | import { test, expect } from './fixtures/base.js';
  2  | 
  3  | test.describe('Flujo de Autenticación (Login) - Patrón POM', () => {
  4  | 
  5  |   test('Debería redirigir al login si un usuario no autenticado intenta acceder a una ruta protegida', async ({ page, loginPage }) => {
  6  |     await loginPage.attemptAccessProtected();
  7  | 
  8  |     await expect(page).toHaveURL(/.*\/login/);
  9  |     await expect(loginPage.submitBtn).toBeVisible();
  10 |   });
  11 | 
  12 |   test('Debería mostrar un mensaje de error con credenciales incorrectas', async ({ loginPage }) => {
  13 |     await loginPage.goto();
  14 |     await loginPage.login('admin_falso', 'clave_mala_123');
  15 | 
> 16 |     await expect(loginPage.getErrorMessageLocator()).toBeVisible();
     |                                                      ^ Error: expect(locator).toBeVisible() failed
  17 |   });
  18 | 
  19 |   test('Debería iniciar sesión exitosamente y redirigir al dashboard', async ({ page, loginPage }) => {
  20 |     await loginPage.goto();
  21 |     await loginPage.login('superadmin', 'superpassword123');
  22 | 
  23 |     await expect(page).toHaveURL(/.*\//);
  24 |   });
  25 | 
  26 | });
  27 | 
```