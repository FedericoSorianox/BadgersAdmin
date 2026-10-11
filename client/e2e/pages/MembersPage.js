export class MembersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Locators principales
    this.newMemberBtn = page.getByRole('button', { name: /Nuevo Socio/i });
    this.searchInput = page.getByPlaceholder(/Buscar/i);
    
    // Elementos del Modal de Nuevo Socio
    this.modalHeader = page.getByRole('heading', { name: /Nuevo Socio/i });
    this.fullNameInput = page.getByPlaceholder(/Nombre completo/i).or(page.locator('input[name="fullName"]'));
    this.ciInput = page.getByPlaceholder(/Cédula/i).or(page.locator('input[name="ci"]'));
    this.saveBtn = page.getByRole('button', { name: /Guardar/i });
  }

  async goto() {
    await this.page.goto('/members');
  }

  async openNewMemberModal() {
    await this.newMemberBtn.click();
  }

  async searchMember(name) {
    await this.searchInput.fill(name);
  }

  // Abstracción del llenado de formulario
  async fillNewMemberForm(memberData) {
    if (memberData.fullName) await this.fullNameInput.fill(memberData.fullName);
    if (memberData.ci) await this.ciInput.fill(memberData.ci);
    // Agregaremos más campos según sea necesario (teléfono, plan, etc)
  }

  async submitForm() {
    await this.saveBtn.click();
  }
}
