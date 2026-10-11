export class InventoryPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Locators principales
    this.newProductBtn = page.getByRole('button', { name: /Nuevo Producto/i });
    this.searchInput = page.getByPlaceholder(/Buscar producto/i);
    
    // Modal
    this.modalHeader = page.getByRole('heading', { name: /Nuevo Producto|Editar Producto/i });
    this.nameInput = page.locator('input[name="name"]').or(page.getByPlaceholder(/Nombre del producto/i));
    this.stockInput = page.locator('input[name="stock"]');
    this.priceInput = page.locator('input[name="salePrice"]');
    this.saveBtn = page.getByRole('button', { name: /Guardar/i });
  }

  async goto() {
    await this.page.goto('/inventory');
  }

  async openNewProductModal() {
    await this.newProductBtn.click();
  }

  async searchProduct(name) {
    await this.searchInput.fill(name);
  }

  async fillProductForm(productData) {
    if (productData.name) await this.nameInput.fill(productData.name);
    if (productData.stock) await this.stockInput.fill(productData.stock.toString());
    if (productData.price) await this.priceInput.fill(productData.price.toString());
  }

  async submitForm() {
    await this.saveBtn.click();
  }
}
