export class PaymentsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Locators principales
    this.pageTitle = page.getByRole('heading', { name: /Control de Pagos/i });
    this.searchInput = page.getByPlaceholder(/Buscar/i);
    this.pendingTab = page.locator('text=Pendientes de Pago');
  }

  async goto() {
    await this.page.goto('/payments');
  }

  async searchPayment(term) {
    await this.searchInput.fill(term);
  }

  async filterPending() {
    await this.pendingTab.click();
  }
}
