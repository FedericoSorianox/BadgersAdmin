# Diagnóstico de Arquitectura, Evaluación Multi-Academia y Plan de Ejecución
**Proyecto**: GymWorks Pro (Original: The Badgers Admin)  
**Fecha**: Septiembre 2026  
**Rol**: Senior Principal Engineer, QA Lead & Software Architect

---

## 1. Diagnóstico del Estado Actual del Código

### 1.1 Stack Tecnológico y Despliegue
- **Frontend**: Single Page Application (SPA) desarrollada en **React 19**, empaquetada con **Vite 7**, estilizada con **Tailwind CSS v4** y componentes de visualización gráfica con **Recharts** e iconos de **Lucide React**.
- **Backend**: API REST en **Node.js** (v22 runtime en contenedor) con **Express 5** y ODM **Mongoose 9** para MongoDB.
- **Despliegue e Infraestructura**: 
  - Contenedor Docker multi-stage (`node:22-alpine` para build y `nginx:alpine` para servir la SPA).
  - Traefik como reverse proxy y gestión de certificados SSL.
  - Orquestación mediante Dokploy.
  - En desarrollo, cliente en puerto 5173/5001 y backend en puerto 5000/5001.

### 1.2 Autenticación, Sesiones y Autorización
- **Modelo de Usuario**: [server/models/User.js](file:///Volumes/Crucial%20X9/Programas/Thebadgersadmin1.0/server/models/User.js) con campos `username`, `password` (hasheado con bcrypt), `role` (`superadmin`, `admin`, `staff`), y `tenantId`.
- **Sesión**: Tokens JWT con expiración de 7 días firmados con clave simétrica (`JWT_SECRET`).
- **Hallazgos de Seguridad Críticos**:
  1. **Backdoor público en producción**: En [server/index.js](file:///Volumes/Crucial%20X9/Programas/Thebadgersadmin1.0/server/index.js), la ruta `GET /fix-promote-admin` promovía al usuario `admin` a `superadmin` y eliminaba su asignación de academia de forma pública y sin autenticación.
  2. **Rutas no protegidas por middleware de auth**: Rutas críticas (`/api/members`, `/api/finance`, `/api/products`, `/api/debts`, `/api/settings`) carecían de verificación de token a nivel de router en `server/index.js`, permitiendo peticiones no autenticadas.
  3. **Ficha pública hiper-expuesta**: `/api/members/public/:id` devolvía datos personales sensibles y comentarios internos privados (`comments`), mientras que `PUT /api/members/public/:id` permitía a cualquier persona en internet modificar cédulas, teléfonos y comentarios sin token de acceso.

### 1.3 Modelos de Datos y Aislamiento por Tenant
- **Plugin de Aislamiento**: Existe [server/plugins/tenantPlugin.js](file:///Volumes/Crucial%20X9/Programas/Thebadgersadmin1.0/server/plugins/tenantPlugin.js) que inyecta `tenantId` en hooks `pre('find')`, `pre('save')`, etc.
- **Limitaciones actuales**:
  - `tenantPlugin` depende de `AsyncLocalStorage` (`tenantStorage`). Si la petición no tiene un `tenantId` resuelto en el middleware, no aplica ningún filtro y permite consultas transversales a toda la base de datos.
  - **Índices únicos globales conflictivos**:
    - `Member.ci`: Definido como `unique: true` global. Impide que dos academias diferentes tengan socios con el mismo documento.
    - `Settings.key`: Definido como `unique: true` global sobre `'admin_config'`. Impide que cada academia tenga su propio documento de configuración.
    - `Notification`: No implementa `tenantPlugin` ni tiene campo `tenantId`.

### 1.4 Acoplamiento con "The Badgers"
- Nombres de instructores y horas fijas en [server/models/Settings.js](file:///Volumes/Crucial%20X9/Programas/Thebadgersadmin1.0/server/models/Settings.js) (`fedeHours`, `gonzaHours`, `fedeDaysOff`, `gonzaDaysOff`, `Guille`, `Uiller`).
- Textos estáticos en pantallas como [client/src/pages/PublicMemberProfile.jsx](file:///Volumes/Crucial%20X9/Programas/Thebadgersadmin1.0/client/src/pages/PublicMemberProfile.jsx) (*"The Badgers Admin"*).
- Moneda uruguaya hardcodeada (`UYU`, formato de moneda uruguaya) y normalización telefónica con prefijo fijo `598`.
- Webhook de N8N fijado a una URL externa en [client/src/pages/Dashboard.jsx](file:///Volumes/Crucial%20X9/Programas/Thebadgersadmin1.0/client/src/pages/Dashboard.jsx) (`https://n8n.vanguardlab.cloud/webhook/webhook-pagos`).

---

## 2. Evaluación de Arquitectura Multi-Academia

Se evaluaron dos alternativas para permitir que múltiples academias operen el sistema:

### Opción A: Instancias Independientes (Single-Tenant Multi-Instancia)
- **Ventajas**: Aislamiento físico a nivel de base de datos y proceso; menor riesgo de contaminación cruzada accidental.
- **Desventajas**: Sobrecarga operativa severa. Cada academia requiere nuevo contenedor Docker en Dokploy, configuración Traefik, certificados, bases de datos independientes, y N despliegues ante cada actualización.

### Opción B: Aplicación Compartida Multi-Tenant con Aislamiento Lógico Estricto (Recomendada)
- **Ventajas**: Costo de infraestructura optimizado; mantenimiento centralizado; despliegue unificado; onboarding instantáneo de nuevas academias.
- **Requisitos de Implementación**:
  1. El `tenantId` se determina **estrictamente en el servidor** a partir del JWT autenticado.
  2. Ningún parámetro de query o cabecera proveniente del frontend puede cambiar la academia autorizada para usuarios estándar (`admin`/`staff`).
  3. Los índices únicos pasan de nivel global a nivel compuesto `{ tenantId: 1, ... }`.
  4. Los registros históricos existentes se asocian al tenant legítimo de *The Badgers*.

---

## 3. Diagnóstico de los 10 Hallazgos Funcionales

| # | Hallazgo | Causa Raíz en Código | Solución Aplicada / Planificada |
|---|---|---|---|
| 1 | Dashboard (28) vs Inventario (38) | En `Dashboard.jsx`, `stockCount` filtra solo productos con `stock > 0`. En `Inventory.jsx`, se muestra el total de productos registrados en el catálogo. | Unificar semántica con etiquetas explícitas: "Productos con Stock" (28) vs "Catálogo Total" (38). |
| 2 | "Socios Activos (excluyendo libres)" vs Plan "Libre" | El indicador filtra `m.active && !m.isExempt`. En la jerga local se llamaba "libres" a socios becados/exentos, pero el plan de pase libre también se llama "Libre". | Renombrar etiqueta a `(Excluyendo becados/exentos)`. |
| 3 | Integrante familiar con $0 aparece con deuda histórica | En `Payments.jsx`, no se excluían los dependientes familiares (`familyId && !isFamilyHead`) de la lista de pendientes mensuales. Como la cuota la paga el titular, el dependiente figuraba como moroso todos los meses. | Excluir dependientes con $0 de la deuda individual y asociar la obligación al titular familiar. |
| 4 | Botones de WhatsApp en socios sin teléfono | El botón se mostraba habilitado sin comprobar existencia de teléfono, y el formato forzaba prefijo `598` uruguayo. | Deshabilitar el botón si falta teléfono y normalizar según código de país configurable. Bloquear envíos en desarrollo. |
| 5 | Plantilla WhatsApp promete pagar desde ficha | En `Dashboard.jsx`, el mensaje decía: *"...y realizar el pago desde tu ficha..."*, pero la ficha no posee pasarela de pago. | Corregir plantilla: *"Puedes consultar el estado de tu cuenta en tu ficha de socio: [Link]"*. |
| 6 | Ficha pública expone datos personales y comentarios | `/api/members/public/:id` entregaba `ci`, `phone`, `comments` y permitía modificaciones vía PUT anónimo. | Mínima exposición pública: solo nombre, foto y estado de cuota. Bloqueo de comentarios privados y de edición no autenticada. |
| 7 | Productos duplicados y cédulas sin formato | No existía normalización `trim()` ni chequeo insensible a mayúsculas/minúsculas en creación de productos. Cédulas sin sanitización. | Trimming, slugs de productos y normalizadores de documentos por país. |
| 8 | Parpadeo con ceros / listas vacías al cargar | Estados en `Finances.jsx` y `Dashboard.jsx` inicializaban `loading: false` o mostraban cálculos sobre arrays vacíos antes de la respuesta HTTP. | Inicializar `loading: true` y presentar estados de carga / skeleton consistentes. |
| 9 | Botones de iconos sin nombre accesible | Botones en tablas y modales carecían de atributos `aria-label` o `title`. | Agregar accesibilidad con `aria-label` descriptivos en todos los botones de iconos. |
| 10 | "Neto" en Finanzas vs "Ganancia Bruta" en Admin | Ambos calculan `Ingresos - Gastos`. Titular `Ingresos - Gastos` como "Ganancia Bruta" es contablemente incorrecto. | Unificar a: Ingresos Totales, Gastos Operativos, Resultado Operativo Neto y Base de Reparto. |

---

## 4. Fases de Ejecución

1. **Fase 1 (En curso)**: Endurecimiento de seguridad en backend, clausura de backdoors, protección de rutas y ficha pública, y suite de pruebas inicial.
2. **Fase 2**: Aislamiento estricto multi-tenant y migración de índices de base de datos.
3. **Fase 3**: Parametrización y configuración por academia (país, moneda, socios dinámicos, plantillas).
4. **Fase 4**: Resolución integral de hallazgos funcionales en interfaz de usuario.
5. **Fase 5**: Auditoría de concurrencia, idempotencia de pagos y confiabilidad operativa.
