# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.js >> Dashboard - Validaciones Core (Patrón POM & Fixtures) >> Debería abrir el modal de Socios Activos al hacer clic en su tarjeta
- Location: e2e/dashboard.spec.js:19:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'SOCIOS ACTIVOS' })
Expected: visible
Error: strict mode violation: getByRole('heading', { name: 'SOCIOS ACTIVOS' }) resolved to 2 elements:
    1) <h3 class="text-xl font-bold text-slate-800 flex-1 truncate pr-4">Socios Activos</h3> aka getByRole('heading', { name: 'Socios Activos', exact: true })
    2) <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">SOCIOS ACTIVOS</h3> aka getByRole('heading', { name: 'SOCIOS ACTIVOS', exact: true })

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'SOCIOS ACTIVOS' }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'SOCIOS ACTIVOS' })

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
        - link "Dashboard" [ref=e11]:
          - /url: /
        - link "Socios" [ref=e18]:
          - /url: /members
        - link "Inventario" [ref=e25]:
          - /url: /inventory
        - link "Finanzas" [ref=e31]:
          - /url: /finances
        - link "Pagos" [ref=e35]:
          - /url: /payments
        - link "Admin" [ref=e39]:
          - /url: /admin
      - generic [ref=e44]:
        - generic [ref=e45]:
          - paragraph [ref=e46]: Contacto
          - paragraph [ref=e47]: contacto@vanguardlab.uy
        - img "Powered by GymWorks Pro" [ref=e49]
    - main [ref=e50]:
      - generic [ref=e52]:
        - generic [ref=e54]:
          - generic [ref=e55]:
            - heading "Socios Activos" [level=3] [ref=e56]
            - button [ref=e57]
          - generic [ref=e62]:
            - textbox "Buscar socio por nombre o cédula..." [ref=e67]
            - paragraph [ref=e68]: "Total: 1 socios activos"
            - generic [ref=e70]:
              - generic [ref=e71]:
                - generic [ref=e72]:
                  - paragraph [ref=e73]: Juan Perez
                  - button "Ver Ficha Pública" [ref=e74]
                - paragraph [ref=e79]: "CI:"
              - generic [ref=e80]:
                - generic [ref=e81]: Activo
                - button "Mover a inactivos" [ref=e82]
        - generic [ref=e88]:
          - heading "Dashboard" [level=1] [ref=e89]
          - paragraph [ref=e90]: Gestión administrativa de The Badgers
        - generic [ref=e91]:
          - heading "Acceso Rápido" [level=3] [ref=e93]
          - generic [ref=e97]:
            - button "Nueva Venta" [ref=e98]
            - button "Nuevo Fiado" [ref=e103]
            - button "Nuevo Gasto" [ref=e109]
            - button "Cierre Caja" [ref=e115]
        - generic [ref=e120]:
          - generic [ref=e121] [cursor=pointer]:
            - heading "SOCIOS ACTIVOS" [level=3] [ref=e128]
            - paragraph [ref=e129]: "1"
            - paragraph [ref=e130]: (Excl. becados/exentos)
          - generic [ref=e131] [cursor=pointer]:
            - heading "INACTIVOS" [level=3] [ref=e138]
            - paragraph [ref=e139]: "1"
            - paragraph [ref=e140]: Ver lista
          - generic [ref=e141] [cursor=pointer]:
            - heading "PRODUCTOS CON STOCK" [level=3] [ref=e147]
            - paragraph [ref=e148]: "1"
            - paragraph [ref=e149]: Disponibles
          - generic [ref=e150] [cursor=pointer]:
            - heading "PAGOS DEL MES" [level=3] [ref=e154]
            - paragraph [ref=e155]: 0%
            - paragraph [ref=e156]: 0 / 1 Pagados
          - generic [ref=e157] [cursor=pointer]:
            - heading "COMUNICACIONES" [level=3] [ref=e161]
            - paragraph [ref=e162]: "1"
            - paragraph [ref=e163]: Socios a Notificar
        - generic [ref=e164]:
          - generic [ref=e165]:
            - heading "Tareas" [level=3] [ref=e166]
            - button "Nueva Tarea" [ref=e170]
          - generic [ref=e172]:
            - generic [ref=e173]:
              - generic [ref=e174]: Asignacion Semanal — octubre de 2026
              - button "Invertir" [ref=e178]
            - generic [ref=e182]:
              - generic [ref=e183]:
                - generic [ref=e184]: Sem 1
                - paragraph [ref=e185]: 28 sept – 4 oct
                - generic [ref=e186]:
                  - generic [ref=e187]: 🔵
                  - text: Fede
              - generic [ref=e188]:
                - generic [ref=e189]: Sem 2
                - paragraph [ref=e190]: 5 oct – 11 oct
                - generic [ref=e191]:
                  - generic [ref=e192]: 🟢
                  - text: Gonza / Andy
              - generic [ref=e193]:
                - generic [ref=e194]: Sem 3
                - paragraph [ref=e195]: 12 oct – 18 oct
                - generic [ref=e196]:
                  - generic [ref=e197]: 🔵
                  - text: Fede
              - generic [ref=e198]:
                - generic [ref=e199]: Sem 4
                - paragraph [ref=e200]: 19 oct – 25 oct
                - generic [ref=e201]:
                  - generic [ref=e202]: 🟢
                  - text: Gonza / Andy
                - generic [ref=e203]: ● AHORA
              - generic [ref=e204]:
                - generic [ref=e205]: Sem 5
                - paragraph [ref=e206]: 26 oct – 1 nov
                - generic [ref=e207]:
                  - generic [ref=e208]: 🔵
                  - text: Fede
          - paragraph [ref=e213]: No hay tareas personalizadas. Crea una con el botón de arriba.
        - generic [ref=e214]:
          - generic [ref=e216]:
            - heading "Control de Fiados (Por Socio)" [level=3] [ref=e217]
            - paragraph [ref=e218]: Agrupado por deudor. Pagos parciales se descuentan de la deuda más antigua.
          - textbox "Buscar socio en deudas..." [ref=e223]
          - generic [ref=e224]: No hay deudas pendientes en este momento.
        - generic [ref=e225]:
          - heading "Cumpleaños del Mes" [level=3] [ref=e227]
          - generic [ref=e230]: No hay cumpleañeros este mes.
```

# Test source

```ts
  1  | import { test, expect } from './fixtures/base.js';
  2  | 
  3  | test.describe('Dashboard - Validaciones Core (Patrón POM & Fixtures)', () => {
  4  | 
  5  |   // Utilizamos nuestra fixture customizada 'mockedDashboardPage' que:
  6  |   // 1. Inyecta el Auth en localStorage
  7  |   // 2. Levanta el DashboardPage (POM)
  8  |   // 3. Aplica todos los Mocks de red antes de arrancar
  9  |   
  10 |   test('Debería renderizar las métricas principales (KPIs) correctamente basadas en los datos', async ({ page, mockedDashboardPage }) => {
  11 |     // Las validaciones de KPIs usan los locators encapsulados en el POM
  12 |     await expect(mockedDashboardPage.activeMembersCard).toBeVisible();
  13 |     await expect(mockedDashboardPage.inactiveMembersCard).toBeVisible();
  14 | 
  15 |     // Verificamos que los números mockeados aparezcan (1 socio activo)
  16 |     await expect(page.locator('text=1').first()).toBeVisible(); 
  17 |   });
  18 | 
  19 |   test('Debería abrir el modal de Socios Activos al hacer clic en su tarjeta', async ({ page, mockedDashboardPage }) => {
  20 |     // Interacciones semánticas gracias al POM
  21 |     await mockedDashboardPage.openActiveMembersModal();
  22 | 
  23 |     // Validamos el modal
> 24 |     await expect(mockedDashboardPage.activeModalHeader).toBeVisible();
     |                                                         ^ Error: expect(locator).toBeVisible() failed
  25 |     await expect(page.getByText('Juan Perez')).toBeVisible();
  26 | 
  27 |     // Acción de Cierre
  28 |     await mockedDashboardPage.closeActiveModal();
  29 |     await expect(mockedDashboardPage.activeModalHeader).toBeHidden();
  30 |   });
  31 | 
  32 |   test('Debería poder buscar un producto en el modal de Stock', async ({ page, mockedDashboardPage }) => {
  33 |     await mockedDashboardPage.openStockModal();
  34 |     await expect(mockedDashboardPage.stockModalHeader).toBeVisible();
  35 | 
  36 |     // Verificamos producto mockeado
  37 |     await expect(page.getByText('Proteína')).toBeVisible();
  38 | 
  39 |     // Búsqueda encapsulada en el POM
  40 |     if (await mockedDashboardPage.searchInput.isVisible()) {
  41 |       await mockedDashboardPage.searchItem('Creatina'); 
  42 |       await expect(page.getByText('Proteína')).toBeHidden();
  43 |     }
  44 |   });
  45 | 
  46 | });
  47 | 
```