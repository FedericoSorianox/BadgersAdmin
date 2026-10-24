# PLAYWRIGHT AGENT RULES & OPERATING GUIDE
> **Rol del Agente:** Senior QA Automation Engineer & Playwright Specialist.  
> **Objetivo:** Cada vez que el usuario solicite crear, actualizar, refactorizar o auditar tests E2E o de API con Playwright, el agente debe seguir estrictamente las reglas, patrones de diseño y estándares definidos en este documento.

---

## 1. PRINCIPIOS DE ARQUITECTURA DEL PROYECTO

El proyecto utiliza una arquitectura modular y escalable para testing ubicada en `client/`.

```
client/
├── playwright.config.js          # Configuración global (baseURL, webServer, browsers, reporters)
└── e2e/
    ├── fixtures/
    │   └── base.js               # Fixture central: inyecta POMs y contextos autenticados
    ├── pages/                    # Page Object Models (POM) - Locators y acciones por módulo
    │   ├── LoginPage.js
    │   ├── DashboardPage.js
    │   ├── MembersPage.js
    │   ├── InventoryPage.js
    │   ├── FinancesPage.js
    │   └── PaymentsPage.js
    ├── api/                      # Tests directos a endpoints backend
    │   ├── fixtures/apiFixture.js# Fixture con cliente HTTP y token JWT pre-inyectado
    │   ├── auth.api.spec.js
    │   ├── members.api.spec.js
    │   ├── debts.api.spec.js
    │   ├── finance.api.spec.js
    │   └── products.api.spec.js
    └── *.spec.js                 # Tests funcionales E2E por módulo (UI)
```

---

## 2. REGLAS DE ORO OBLIGATORIAS (NON-NEGOTIABLE)

### Regla 1: Patrón Page Object Model (POM) Obligatorio
- **NUNCA** escribir selectores directos (`page.locator()`, `page.getByRole()`) repetidos dentro de los archivos de prueba `*.spec.js`.
- Toda interacción con la interfaz (clicks, inputs, modales, lectura de tablas) debe vivir dentro de una clase POM en `client/e2e/pages/`.
- Los tests `*.spec.js` solo deben orquestar el flujo llamando a los métodos del POM y realizando aserciones `expect()`.

### Regla 2: Inyección de Dependencias por Fixtures
- **NUNCA** instanciar manualmente una página con `new MiPagina(page)` en los tests.
- Todo POM nuevo debe registrarse en `client/e2e/fixtures/base.js`.
- En los tests, importar `{ test, expect }` siempre desde `'./fixtures/base.js'`.

### Regla 3: Autenticación Rápida y Aislada
- **NUNCA** repetir el flujo de login por formulario en pruebas de módulos internos (Socios, Inventario, Finanzas, etc.).
- Para módulos protegidos, usar la fixture `authenticatedPage` o `mockedDashboardPage` provistas en `client/e2e/fixtures/base.js`, las cuales inyectan el token y estado en `localStorage` antes de cargar la página.
- El formulario visual de login (`/login`) se prueba **únicamente** en `client/e2e/login.spec.js`.

### Regla 4: Flakiness CERO y Prohibición de Tiempos Ciegos
- **ESTRICTAMENTE PROHIBIDO** el uso de `page.waitForTimeout()` o sleeps fijos.
- Usar siempre **Aserciones Web-First** que tienen reintentos automáticos integrados:
  ```javascript
  // CORRECTO:
  await expect(page.getByText('Socio Guardado')).toBeVisible();
  await expect(page).toHaveURL(/.*\/members/);

  // PROHIBIDO:
  await page.waitForTimeout(3000); // ❌
  ```
- Si se necesita esperar una llamada de red antes de continuar:
  ```javascript
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/members') && resp.status() === 200),
    membersPage.submitForm()
  ]);
  ```

### Regla 5: Estrategia de Selectores Resilientes (User-First)
Priorizar selectores que reflejen cómo el usuario final interactúa con la aplicación (Accesibilidad):
1. `page.getByRole('button', { name: /guardar/i })` (usar regex case-insensitive)
2. `page.getByRole('heading', { name: /nuevo socio/i })`
3. `page.getByPlaceholder(/nombre completo/i)`
4. `page.getByLabel('...')`
5. `page.getByText('...')`
6. `page.getByTestId('...')`
7. Selector CSS o atributo semántico como último recurso usando fallback `.or()`:
   ```javascript
   this.fullNameInput = page.getByPlaceholder(/Nombre completo/i).or(page.locator('input[name="fullName"]'));
   ```
- **PROHIBIDO** usar clases de utilidad CSS o Tailwind para interactuar (ej. `page.locator('.bg-blue-600.px-4')` ❌).

### Regla 6: Mocking de Red vs Backend Real
- **Tests de UI/Componentes (Aislados):** Usar `page.route('**/api/...', route => route.fulfill({...}))` para simular respuestas exitosas, respuestas vacías o errores (400, 500) sin depender del estado del servidor.
- **Tests de Integración / API:** Si interactúan con el backend real, deben incluir **CLEANUP** al final (ej. borrar registros creados para no ensuciar la base de datos).

---

## 3. PROTOCOLO DE TRABAJO CUANDO SE PIDE UN NUEVO TEST

Cuando el usuario pida crear un test para una funcionalidad o pantalla, el agente debe proceder en el siguiente orden estricto:

### Paso 1: Inspeccionar la Interfaz y el Código Fuente
1. Localizar la vista correspondiente en `client/src/pages/` o `client/src/components/`.
2. Identificar:
   - Rutas de navegación (ej. `/members`, `/finances`).
   - Botones, inputs, modales, formularios y mensajes de notificación (toast/alert).
   - Endpoints del backend que consume (`/api/...`).

### Paso 2: Crear o Extender el Page Object Model (POM)
- Si no existe `client/e2e/pages/[Nombre]Page.js`, crearlo siguiendo el template canónico.
- Si ya existe, añadir los locators y métodos necesarios sin duplicar código.

### Paso 3: Registrar el POM en `client/e2e/fixtures/base.js`
- Importar la clase en `base.js` y añadirla a la extensión de `test`:
  ```javascript
  miNuevoPage: async ({ page }, use) => {
    await use(new MiNuevoPage(page));
  },
  ```

### Paso 4: Definir la Matriz de Casos de Prueba (QA Mindset)
Para cada módulo a probar, estructurar los tests cubriendo:
1. **Happy Path:** Carga correcta de la página, listado de datos y flujo exitoso de creación/edición.
2. **Validaciones / Casos Borde:** Formulario vacío, formatos inválidos, valores duplicados.
3. **Manejo de Errores de Red:** Mostrar mensaje adecuado ante error 500 del servidor (usando `route.fulfill({ status: 500 })`).
4. **Búsqueda / Filtrado:** Búsqueda con resultados coincidentes y búsqueda sin resultados.

### Paso 5: Escribir el Archivo de Test (`client/e2e/[modulo].spec.js`)
- Títulos descriptivos en español usando la convención `Debería [acción esperada]`.
- Código limpio, legible y modular.

### Paso 6: Verificación de Ejecución
- Comprobar que el test no tenga errores de sintaxis y sea ejecutable con:
  ```bash
  npx playwright test e2e/[modulo].spec.js
  ```

---

## 4. PLANTILLAS DE CÓDIGO CANÓNICAS

### A. Template: Page Object Model (`client/e2e/pages/EjemploPage.js`)
```javascript
export class EjemploPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Locators principales
    this.heading = page.getByRole('heading', { name: /ejemplo/i });
    this.createBtn = page.getByRole('button', { name: /nuevo/i });
    this.searchInput = page.getByPlaceholder(/buscar/i);

    // Locators de Formulario / Modal
    this.nameInput = page.getByPlaceholder(/nombre/i).or(page.locator('input[name="name"]'));
    this.saveBtn = page.getByRole('button', { name: /guardar/i });
    this.modal = page.getByRole('dialog').or(page.locator('.modal-container'));
  }

  async goto() {
    await this.page.goto('/ejemplo');
  }

  async openCreateModal() {
    await this.createBtn.click();
  }

  async fillForm(data) {
    if (data.name) await this.nameInput.fill(data.name);
  }

  async submit() {
    await this.saveBtn.click();
  }

  async search(term) {
    await this.searchInput.fill(term);
  }
}
```

### B. Template: Registro en Fixture (`client/e2e/fixtures/base.js`)
```javascript
import { test as baseTest } from '@playwright/test';
import { EjemploPage } from '../pages/EjemploPage.js';
// ... otros POMs

export const test = baseTest.extend({
  ejemploPage: async ({ page }, use) => {
    await use(new EjemploPage(page));
  },
  // ... resto de fixtures
});

export { expect } from '@playwright/test';
```

### C. Template: Test E2E Funcional (`client/e2e/ejemplo.spec.js`)
```javascript
import { test, expect } from './fixtures/base.js';

test.describe('Módulo de Ejemplo - E2E Core', () => {

  test.beforeEach(async ({ authenticatedPage, ejemploPage }) => {
    // Intercepción de red para aislar el frontend
    await authenticatedPage.route('**/api/ejemplo', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          json: [{ _id: '1', name: 'Elemento de Prueba' }]
        });
      } else if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          json: { _id: '2', name: 'Nuevo Elemento Creado' }
        });
      }
    });

    await ejemploPage.goto();
  });

  test('Debería listar los elementos cargados', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.getByText('Elemento de Prueba')).toBeVisible();
  });

  test('Debería abrir el modal y completar el formulario de creación', async ({ ejemploPage, authenticatedPage }) => {
    await ejemploPage.openCreateModal();
    await ejemploPage.fillForm({ name: 'Nuevo Elemento Creado' });
    await ejemploPage.submit();

    // Validar confirmación o cierre de modal
    await expect(authenticatedPage.getByText('Elemento de Prueba')).toBeVisible();
  });

  test('Debería filtrar elementos al escribir en el buscador', async ({ ejemploPage, authenticatedPage }) => {
    await ejemploPage.search('Prueba');
    await expect(authenticatedPage.getByText('Elemento de Prueba')).toBeVisible();
  });

});
```

### D. Template: Test de API Backend (`client/e2e/api/ejemplo.api.spec.js`)
```javascript
import { test, expect, API_BASE } from './fixtures/apiFixture.js';

test.describe('API - Ejemplo (/api/ejemplo)', () => {

  test('GET / - Debería retornar lista con status 200', async ({ requestAuth }) => {
    const response = await requestAuth.get(`${API_BASE}/ejemplo`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('POST / & DELETE / - Flujo completo con cleanup', async ({ requestAuth }) => {
    // 1. Crear
    const postRes = await requestAuth.post(`${API_BASE}/ejemplo`, {
      data: { name: 'Test API Temporal' }
    });
    expect(postRes.status()).toBe(201);
    const created = await postRes.json();
    expect(created).toHaveProperty('_id');

    // 2. Cleanup obligatorio
    const deleteRes = await requestAuth.delete(`${API_BASE}/ejemplo/${created._id}`);
    expect(deleteRes.status()).toBe(200);
  });

});
```

---

## 5. COMANDOS ÚTILES PARA EL AGENTE Y EL DESARROLLADOR

Ejecutar siempre desde la carpeta `client/`:

```bash
# Correr todos los tests en headless
npx playwright test

# Correr un archivo específico
npx playwright test e2e/members.spec.js

# Correr solo los tests de API
npx playwright test e2e/api/

# Modo interactivo UI con time-travel y DOM inspector
npx playwright test --ui

# Modo debug paso a paso (Playwright Inspector)
npx playwright test e2e/login.spec.js --debug

# Ver el último reporte HTML generado
npx playwright show-report
```

---

## 6. CHECKLIST DE REVISIÓN ANTES DE DAR UN TEST POR COMPLETADO

1. [ ] ¿Se utilizó el Page Object Model sin selectores sueltos en el `.spec.js`?
2. [ ] ¿El nuevo POM está registrado en `client/e2e/fixtures/base.js`?
3. [ ] ¿Se usó `authenticatedPage` para evitar logins redundantes?
4. [ ] ¿Se evitaron esperas arbitrarias (`waitForTimeout`) en favor de `expect()` web-first?
5. [ ] ¿Los nombres de los tests describen claramente el comportamiento esperado en español?
6. [ ] Si interactúa con la base de datos real, ¿se limpiaron los datos de prueba creados?
