import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Directorio donde vivirán nuestros tests End-to-End
  testDir: './e2e',

  // Ejecuta los tests en paralelo para mayor velocidad
  fullyParallel: true,

  // Si estamos en CI (GitHub Actions, etc), falla si dejamos un test.only() por error
  forbidOnly: !!process.env.CI,

  // Reintentos: En local no reintenta para ver el error rápido. En CI reintenta 2 veces para evitar "flakiness" (tests intermitentes)
  retries: process.env.CI ? 2 : 0,

  // Trabajadores concurrentes
  workers: process.env.CI ? 1 : undefined,

  // Reporter HTML por defecto: nos dará un dashboard visual muy útil
  reporter: 'html',

  // Configuración compartida para todos los proyectos (navegadores)
  use: {
    // Base URL de nuestro dev server (Vite)
    baseURL: 'http://localhost:5173',

    // Recolectar traces (pantallazos, red, consola) cuando un test falla y se reintenta
    // Es clave para debuggear en un entorno de Integración Continua (CI)
    trace: 'on-first-retry',

    // Grabar video del test si falla (opcional, pero excelente para QA)
    video: 'retain-on-failure',
  },

  // Configuración de navegadores que vamos a probar
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Podemos habilitar Mobile testing fácilmente descomentando esto:
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Levantar automáticamente Backend y Frontend antes de correr los tests
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../server',
      url: 'http://localhost:5001',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      cwd: './', // El CWD por defecto es donde está el config (client)
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    }
  ],
});
