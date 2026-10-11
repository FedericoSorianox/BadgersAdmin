export class DashboardPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    
    // Locators principales
    this.activeMembersCard = page.locator('text=SOCIOS ACTIVOS');
    this.inactiveMembersCard = page.locator('text=INACTIVOS');
    this.stockCard = page.locator('text=PRODUCTOS CON STOCK');
    
    // Modales
    this.activeModalHeader = page.getByRole('heading', { name: 'SOCIOS ACTIVOS' });
    this.stockModalHeader = page.getByRole('heading', { name: 'PRODUCTOS CON STOCK' });
    this.searchInput = page.getByPlaceholder(/buscar/i);
  }

  async goto() {
    await this.page.goto('/');
  }

  async openActiveMembersModal() {
    await this.activeMembersCard.click();
  }

  async openStockModal() {
    await this.stockCard.click();
  }

  async closeActiveModal() {
    await this.page.keyboard.press('Escape');
  }

  async searchItem(itemName) {
    await this.searchInput.fill(itemName);
  }

  // Encapsulamos el Mocking aquí para que los tests queden limpios
  async setupNetworkMocks() {
    await this.page.route('**/api/finance', route => route.fulfill({ json: [] }));
    await this.page.route('**/api/products', route => route.fulfill({ 
      json: [ { _id: '1', name: 'Proteína', stock: 10, salePrice: 1500 } ] 
    }));
    await this.page.route('**/api/members', route => route.fulfill({ 
      json: [
        { _id: '1', fullName: 'Juan Perez', active: true, planType: 'Libre' },
        { _id: '2', fullName: 'Ana Gomez', active: false, planType: '8 Clases' }
      ] 
    }));
    await this.page.route('**/api/debts', route => route.fulfill({ json: [] }));
    await this.page.route('**/api/notifications/reminders*', route => route.fulfill({ json: [] }));
    await this.page.route('**/api/settings', route => route.fulfill({ json: { tasks: [] } }));
    await this.page.route('**/api/finance/expenses', route => route.fulfill({ json: [] }));
  }
}
