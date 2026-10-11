import { test, expect } from './fixtures/base.js';

test.describe('Módulo de Socios (Members) - E2E Core', () => {

  // Al usar la fixture 'authenticatedPage', evitamos la pantalla de login.
  test.beforeEach(async ({ authenticatedPage, membersPage }) => {
    // Simulamos la respuesta de la red para aislar el frontend (Test de Componente E2E)
    // De lo contrario, necesitaríamos que el backend devuelva socios reales.
    await authenticatedPage.route('**/api/members', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({ 
          json: [
            { _id: '1', fullName: 'Carlos Santana', ci: '1234567-8', active: true, planType: 'Libre' }
          ] 
        });
      } else if (route.request().method() === 'POST') {
        route.fulfill({ status: 201, json: { _id: '2', fullName: 'Socio Nuevo' } });
      }
    });

    await membersPage.goto();
  });

  test('Debería cargar la tabla de socios correctamente', async ({ authenticatedPage }) => {
    // Validamos que el socio mockeado esté en la pantalla
    await expect(authenticatedPage.getByText('Carlos Santana')).toBeVisible();
    await expect(authenticatedPage.getByText('1234567-8')).toBeVisible();
  });

  test('Debería abrir el modal para agregar un nuevo socio y poder llenarlo', async ({ authenticatedPage, membersPage }) => {
    await membersPage.openNewMemberModal();

    // Verificamos que el modal se abrió
    await expect(membersPage.modalHeader).toBeVisible();

    // Llenamos el formulario usando la abstracción
    await membersPage.fillNewMemberForm({
      fullName: 'Socio Nuevo',
      ci: '9876543-2'
    });

    // Guardamos
    await membersPage.submitForm();

    // Si tu app muestra un toast o cierra el modal, lo validamos aquí
    // await expect(membersPage.modalHeader).toBeHidden(); 
  });

  test('Debería poder buscar un socio específico', async ({ authenticatedPage, membersPage }) => {
    await membersPage.searchMember('Santana');
    await expect(authenticatedPage.getByText('Carlos Santana')).toBeVisible();
  });

});
