import { test as baseTest, request as playwrightRequest } from '@playwright/test';

export const API_BASE = 'http://localhost:5000/api';

export const test = baseTest.extend({
  // Fixture: requestAuth
  // Retorna un contexto de API ya autenticado para que los tests no tengan que hacer login.
  requestAuth: async ({}, use) => {
    // 1. Instanciamos un contexto de request aislado
    const context = await playwrightRequest.newContext();
    
    // 2. Ejecutamos el Login para conseguir el token
    const loginRes = await context.post(`${API_BASE}/auth/login`, {
      data: { username: 'superadmin', password: 'superpassword123' }
    });
    
    let token = '';
    if (loginRes.ok()) {
      const body = await loginRes.json();
      token = body.token;
    }

    // 3. Creamos un nuevo contexto que ya inyecta el token en las cabeceras por defecto
    const authenticatedContext = await playwrightRequest.newContext({
      extraHTTPHeaders: {
        'x-auth-token': token
      }
    });

    // 4. Se lo entregamos al test
    await use(authenticatedContext);

    // 5. Cleanup: cerramos los contextos al finalizar
    await context.dispose();
    await authenticatedContext.dispose();
  }
});

export { expect } from '@playwright/test';
