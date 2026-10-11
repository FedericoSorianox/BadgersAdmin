import { test, expect } from './fixtures/base.js';

test.describe('Módulo de Inventario (Products) - E2E Core', () => {

  test.beforeEach(async ({ authenticatedPage, inventoryPage }) => {
    // Interceptamos la llamada de productos para inyectar datos falsos
    await authenticatedPage.route('**/api/products', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({ 
          json: [
            { _id: '1', name: 'Proteína Whey', stock: 15, salePrice: 2000, category: 'Suplementos' }
          ] 
        });
      } else if (route.request().method() === 'POST') {
        route.fulfill({ status: 201, json: { _id: '2', name: 'Producto Nuevo' } });
      }
    });

    await inventoryPage.goto();
  });

  test('Debería cargar la tabla de productos', async ({ authenticatedPage }) => {
    // El producto mockeado debe renderizarse
    await expect(authenticatedPage.getByText('Proteína Whey')).toBeVisible();
    await expect(authenticatedPage.getByText('15')).toBeVisible(); // Stock
  });

  test('Debería abrir el modal para agregar un producto y llenarlo', async ({ inventoryPage }) => {
    await inventoryPage.openNewProductModal();
    await expect(inventoryPage.modalHeader).toBeVisible();

    await inventoryPage.fillProductForm({
      name: 'Producto Nuevo',
      stock: 50,
      price: 1500
    });

    await inventoryPage.submitForm();
  });

  test('Debería poder buscar un producto por nombre', async ({ authenticatedPage, inventoryPage }) => {
    await inventoryPage.searchProduct('Whey');
    await expect(authenticatedPage.getByText('Proteína Whey')).toBeVisible();

    // Probamos algo que no existe
    await inventoryPage.searchProduct('Creatina');
    await expect(authenticatedPage.getByText('Proteína Whey')).toBeHidden();
  });

});
