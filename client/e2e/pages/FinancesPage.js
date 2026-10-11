export class FinancesPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Locators principales
    this.newExpenseBtn = page.getByRole('button', { name: /Nuevo Gasto/i });
    this.newSaleBtn = page.getByRole('button', { name: /Nueva Venta/i });
    
    // Elementos del Modal de Nuevo Gasto
    this.expenseModalHeader = page.getByRole('heading', { name: /Nuevo Gasto/i });
    this.expenseConceptInput = page.getByPlaceholder(/Concepto/i).or(page.locator('input[name="concept"]')).or(page.locator('select'));
    this.expenseAmountInput = page.getByPlaceholder(/Monto/i).or(page.locator('input[type="number"]'));
    this.expenseSaveBtn = page.getByRole('button', { name: /Guardar/i });
  }

  async goto() {
    await this.page.goto('/finances');
  }

  async openNewExpenseModal() {
    await this.newExpenseBtn.click();
  }

  async fillExpenseForm(data) {
    if (data.amount) {
      await this.expenseAmountInput.fill(data.amount.toString());
    }
  }

  async submitExpense() {
    await this.expenseSaveBtn.click();
  }
}
