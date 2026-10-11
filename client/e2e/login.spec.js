import { test, expect } from './fixtures/base.js';

test.describe('Flujo de Autenticación (Login) - Patrón POM', () => {

  test('Debería redirigir al login si un usuario no autenticado intenta acceder a una ruta protegida', async ({ page, loginPage }) => {
    await loginPage.attemptAccessProtected();

    await expect(page).toHaveURL(/.*\/login/);
    await expect(loginPage.submitBtn).toBeVisible();
  });

  test('Debería mostrar un mensaje de error con credenciales incorrectas', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('admin_falso', 'clave_mala_123');

    await expect(loginPage.getErrorMessageLocator()).toBeVisible();
  });

  test('Debería iniciar sesión exitosamente y redirigir al dashboard', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login('superadmin', 'superpassword123');

    await expect(page).toHaveURL(/.*\//);
  });

});
