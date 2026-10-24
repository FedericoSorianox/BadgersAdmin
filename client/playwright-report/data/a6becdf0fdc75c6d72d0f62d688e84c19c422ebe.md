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
        - link "Dashboard" [ref=e11] [cursor=pointer]:
          - /url: /
        - link "Socios" [ref=e18] [cursor=pointer]:
          - /url: /members
        - link "Inventario" [ref=e25] [cursor=pointer]:
          - /url: /inventory
        - link "Finanzas" [ref=e32] [cursor=pointer]:
          - /url: /finances
        - link "Pagos" [ref=e37] [cursor=pointer]:
          - /url: /payments
        - link "Admin" [ref=e42] [cursor=pointer]:
          - /url: /admin
      - generic [ref=e47]:
        - generic [ref=e48]:
          - paragraph [ref=e49]: Contacto
          - paragraph [ref=e50]: contacto@vanguardlab.uy
        - img "Powered by GymWorks Pro" [ref=e52]
    - main [ref=e53]:
      - generic [ref=e55]:
        - generic [ref=e57]:
          - generic [ref=e58]:
            - heading "Socios Activos" [level=3] [ref=e59]
            - button [ref=e60]
          - generic [ref=e65]:
            - textbox "Buscar socio por nombre o cédula..." [ref=e70]
            - paragraph [ref=e71]: "Total: 1 socios activos"
            - generic [ref=e73]:
              - generic [ref=e74]:
                - generic [ref=e75]:
                  - paragraph [ref=e76]: Juan Perez
                  - button "Ver Ficha Pública" [ref=e77]
                - paragraph [ref=e82]: "CI:"
              - generic [ref=e83]:
                - generic [ref=e84]: Activo
                - button "Mover a inactivos" [ref=e85]
        - generic [ref=e91]:
          - heading "Dashboard" [level=1] [ref=e92]
          - paragraph [ref=e93]: Gestión administrativa de The Badgers
        - generic [ref=e94]:
          - heading "Acceso Rápido" [level=3] [ref=e96]
          - generic [ref=e100]:
            - button "Nueva Venta" [ref=e101]
            - button "Nuevo Fiado" [ref=e107]
            - button "Nuevo Gasto" [ref=e113]
            - button "Cierre Caja" [ref=e119]
        - generic [ref=e133]:
          - generic [ref=e134] [cursor=pointer]:
            - heading "SOCIOS ACTIVOS" [level=3] [ref=e141]
            - paragraph [ref=e142]: "1"
            - paragraph [ref=e143]: (Excl. becados/exentos)
          - generic [ref=e144] [cursor=pointer]:
            - heading "INACTIVOS" [level=3] [ref=e151]
            - paragraph [ref=e152]: "1"
            - paragraph [ref=e153]: Ver lista
          - generic [ref=e154] [cursor=pointer]:
            - heading "PRODUCTOS CON STOCK" [level=3] [ref=e161]
            - paragraph [ref=e162]: "1"
            - paragraph [ref=e163]: Disponibles
          - generic [ref=e164] [cursor=pointer]:
            - heading "PAGOS DEL MES" [level=3] [ref=e169]
            - paragraph [ref=e170]: 0%
            - paragraph [ref=e171]: 0 / 1 Pagados
          - generic [ref=e172] [cursor=pointer]:
            - heading "COMUNICACIONES" [level=3] [ref=e176]
            - paragraph [ref=e177]: "1"
            - paragraph [ref=e178]: Socios a Notificar
        - generic [ref=e179]:
          - generic [ref=e180]:
            - heading "Tareas" [level=3] [ref=e181]
            - button "Nueva Tarea" [ref=e189]
          - generic [ref=e193]:
            - generic [ref=e194]:
              - generic [ref=e195]: Asignacion Semanal — octubre de 2026
              - button "Invertir" [ref=e199]
            - generic [ref=e205]:
              - generic [ref=e206]:
                - generic [ref=e207]: Sem 1
                - paragraph [ref=e208]: 28 sept – 4 oct
                - generic [ref=e209]:
                  - generic [ref=e210]: 🔵
                  - text: Fede
              - generic [ref=e211]:
                - generic [ref=e212]: Sem 2
                - paragraph [ref=e213]: 5 oct – 11 oct
                - generic [ref=e214]:
                  - generic [ref=e215]: 🟢
                  - text: Gonza / Andy
              - generic [ref=e216]:
                - generic [ref=e217]: Sem 3
                - paragraph [ref=e218]: 12 oct – 18 oct
                - generic [ref=e219]:
                  - generic [ref=e220]: 🔵
                  - text: Fede
              - generic [ref=e221]:
                - generic [ref=e222]: Sem 4
                - paragraph [ref=e223]: 19 oct – 25 oct
                - generic [ref=e224]:
                  - generic [ref=e225]: 🟢
                  - text: Gonza / Andy
                - generic [ref=e226]: ● AHORA
              - generic [ref=e227]:
                - generic [ref=e228]: Sem 5
                - paragraph [ref=e229]: 26 oct – 1 nov
                - generic [ref=e230]:
                  - generic [ref=e231]: 🔵
                  - text: Fede
          - paragraph [ref=e240]: No hay tareas personalizadas. Crea una con el botón de arriba.
        - generic [ref=e241]:
          - generic [ref=e243]:
            - heading "Control de Fiados (Por Socio)" [level=3] [ref=e244]
            - paragraph [ref=e245]: Agrupado por deudor. Pagos parciales se descuentan de la deuda más antigua.
          - textbox "Buscar socio en deudas..." [ref=e250]
          - generic [ref=e251]: No hay deudas pendientes en este momento.
        - generic [ref=e252]:
          - heading "Cumpleaños del Mes" [level=3] [ref=e254]
          - generic [ref=e260]: No hay cumpleañeros este mes.
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