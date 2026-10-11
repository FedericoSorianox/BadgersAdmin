export class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    
    // Localizadores (Locators)
    this.usernameInput = page.getByPlaceholder('Usuario');
    this.passwordInput = page.getByPlaceholder('••••••••');
    this.submitBtn = page.getByRole('button', { name: 'Ingresar al Panel' });
    this.errorMessage = page.locator('text=Error de autenticación');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitBtn.click();
  }

  async attemptAccessProtected() {
    await this.page.goto('/members');
  }

  // Las validaciones también pueden vivir aquí, o retornar los locators al test
  getErrorMessageLocator() {
    return this.errorMessage;
  }
}
