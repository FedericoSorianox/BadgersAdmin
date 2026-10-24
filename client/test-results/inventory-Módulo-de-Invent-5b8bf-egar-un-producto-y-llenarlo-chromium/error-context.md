# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inventory.spec.js >> Módulo de Inventario (Products) - E2E Core >> Debería abrir el modal para agregar un producto y llenarlo
- Location: e2e/inventory.spec.js:28:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="name"]').or(getByPlaceholder(/Nombre del producto/i))

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e6]:
        - img "GymWorksPro" [ref=e7]
        - heading "GymWorksPro" [level=1] [ref=e9]
      - navigation [ref=e10]:
        - link "Dashboard" [ref=e11] [cursor=pointer]:
          - /url: /
        - link "Socios" [ref=e18] [cursor=pointer]:
          - /url: /members
        - link "Inventario" [ref=e25] [cursor=pointer]:
          - /url: /inventory
        - link "Finanzas" [ref=e31] [cursor=pointer]:
          - /url: /finances
        - link "Pagos" [ref=e35] [cursor=pointer]:
          - /url: /payments
        - link "Admin" [ref=e39] [cursor=pointer]:
          - /url: /admin
      - generic [ref=e44]:
        - generic [ref=e45]:
          - paragraph [ref=e46]: Contacto
          - paragraph [ref=e47]: contacto@vanguardlab.uy
        - img "Powered by GymWorks Pro" [ref=e49]
    - main [ref=e50]:
      - generic [ref=e52]:
        - generic [ref=e53]:
          - generic [ref=e54]:
            - heading "Inventario" [level=1] [ref=e55]
            - paragraph [ref=e56]: Control de stock y productos.
          - button "Nuevo Producto" [active] [ref=e57]
        - generic [ref=e59]:
          - generic [ref=e66]:
            - paragraph [ref=e67]: Total Productos
            - paragraph [ref=e68]: "1"
          - generic [ref=e73]:
            - paragraph [ref=e74]: Stock Crítico
            - paragraph [ref=e75]: "0"
          - generic [ref=e81]:
            - paragraph [ref=e82]: Valor Inventario
            - paragraph [ref=e83]: $NaN
        - generic [ref=e84]:
          - generic [ref=e85]:
            - textbox "Buscar producto..." [ref=e90]
            - button "Recargar" [ref=e91]
          - table [ref=e98]:
            - rowgroup [ref=e99]:
              - row [ref=e100]:
                - columnheader "Producto" [ref=e101]
                - columnheader "Categoría" [ref=e102]
                - columnheader "Costo" [ref=e103]
                - columnheader "Precio Venta" [ref=e104]
                - columnheader "Ganancia" [ref=e105]
                - columnheader "Stock" [ref=e106]
                - columnheader "Estado" [ref=e107]
                - columnheader "Acciones" [ref=e108]
            - rowgroup [ref=e109]:
              - row [ref=e110]:
                - cell "Proteína Whey" [ref=e111]
                - cell "Suplementos" [ref=e112]
                - cell "$" [ref=e113]
                - cell "$2000" [ref=e114]
                - cell "$2000" [ref=e115]
                - cell "15" [ref=e116]
                - cell "Normal" [ref=e117]
                - cell [ref=e118]:
                  - button [ref=e119]
                  - button [ref=e122]
        - generic [ref=e127]:
          - heading "Nuevo Producto" [level=3] [ref=e128]
          - generic [ref=e129]:
            - generic [ref=e130]:
              - generic [ref=e131]: Nombre
              - textbox [ref=e132]
            - generic [ref=e133]:
              - generic [ref=e134]: Categoría
              - textbox [ref=e135]
            - generic [ref=e136]:
              - generic [ref=e137]:
                - generic [ref=e138]: Precio Costo
                - spinbutton [ref=e139]: "0"
              - generic [ref=e140]:
                - generic [ref=e141]: Precio Venta
                - spinbutton [ref=e142]: "0"
            - generic [ref=e143]:
              - generic [ref=e144]: Stock
              - spinbutton [ref=e145]: "0"
            - generic [ref=e146]:
              - generic [ref=e147]: Imagen del Producto
              - button "Choose File" [ref=e148]
            - generic [ref=e149]:
              - checkbox "Mostrar en Acceso Rápido (Dashboard)" [ref=e150]
              - generic [ref=e151] [cursor=pointer]: Mostrar en Acceso Rápido (Dashboard)
            - generic [ref=e152]:
              - button "Cancelar" [ref=e153]
              - button "Crear Producto" [ref=e154]
```

# Test source

```ts
  1  | export class InventoryPage {
  2  |   /**
  3  |    * @param {import('@playwright/test').Page} page
  4  |    */
  5  |   constructor(page) {
  6  |     this.page = page;
  7  | 
  8  |     // Locators principales
  9  |     this.newProductBtn = page.getByRole('button', { name: /Nuevo Producto/i });
  10 |     this.searchInput = page.getByPlaceholder(/Buscar producto/i);
  11 |     
  12 |     // Modal
  13 |     this.modalHeader = page.getByRole('heading', { name: /Nuevo Producto|Editar Producto/i });
  14 |     this.nameInput = page.locator('input[name="name"]').or(page.getByPlaceholder(/Nombre del producto/i));
  15 |     this.stockInput = page.locator('input[name="stock"]');
  16 |     this.priceInput = page.locator('input[name="salePrice"]');
  17 |     this.saveBtn = page.getByRole('button', { name: /Guardar/i });
  18 |   }
  19 | 
  20 |   async goto() {
  21 |     await this.page.goto('/inventory');
  22 |   }
  23 | 
  24 |   async openNewProductModal() {
  25 |     await this.newProductBtn.click();
  26 |   }
  27 | 
  28 |   async searchProduct(name) {
  29 |     await this.searchInput.fill(name);
  30 |   }
  31 | 
  32 |   async fillProductForm(productData) {
> 33 |     if (productData.name) await this.nameInput.fill(productData.name);
     |                                                ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  34 |     if (productData.stock) await this.stockInput.fill(productData.stock.toString());
  35 |     if (productData.price) await this.priceInput.fill(productData.price.toString());
  36 |   }
  37 | 
  38 |   async submitForm() {
  39 |     await this.saveBtn.click();
  40 |   }
  41 | }
  42 | 
```