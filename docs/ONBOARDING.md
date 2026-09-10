# Guía de Onboarding para Nuevas Academias (Tenants)

Esta guía documenta el proceso oficial para crear y configurar una nueva academia o gimnasio dentro de GymWorksPro, asegurando que sus datos queden completamente aislados.

---

## 1. Preparación y Datos del Cliente
Antes de crear el Tenant, solicitá al nuevo cliente la siguiente información:
* **Nombre del Gimnasio**
* **Colores de la marca** (Primario, Secundario)
* **Logo** (ideal formato cuadrado, fondo transparente o blanco)
* **Datos regionales**: País, moneda (ej. UYU, ARS, USD), símbolo, huso horario.
* **Email / Usuario Administrador**: Nombre de usuario sugerido para su acceso.

## 2. Creación del Tenant en el Panel
1. Ingresá a **[gymworkspro.com/superadmin](https://gymworkspro.com/superadmin)** con tus credenciales.
2. Hacé clic en **"Nuevo Gimnasio"**.
3. Completá el formulario:
   * **Nombre**: Ej. `Cobra Kai Dojo`
   * **Slug**: Un identificador corto y sin espacios (ej. `cobrakai`). *Este será usado en su URL.*
   * **Usuario y Contraseña Admin**: Estas son las credenciales iniciales que le vas a entregar al cliente.
   * **Branding**: Configurá los colores principales y subí el Logo.
4. Guardá los cambios. El sistema automáticamente aislará los datos para este Slug.

## 3. Configuración de DNS (Subdominio)
Para que el cliente pueda entrar a `cobrakai.gymworkspro.com`, necesitás que tu proveedor de dominios (donde compraste `gymworkspro.com`) redirija ese tráfico al servidor.

Dado que ya tenés un registro **CNAME "@"** o similar, tenés dos opciones:
* **Opción A (Recomendada): Wildcard DNS**. Crear un registro CNAME con el nombre `*` apuntando a tu servidor. Esto hace que cualquier subdominio inventado funcione automáticamente sin que tengas que tocar el DNS nunca más.
* **Opción B: Manual**. Cada vez que crees un cliente (ej. `cobrakai`), tenés que ir a tu proveedor de dominios y crear un nuevo registro CNAME llamado `cobrakai` apuntando a la misma IP o dominio base.

## 4. Entrega y Setup Inicial del Cliente
1. Entregale al cliente su URL de acceso: `https://[slug].gymworkspro.com`.
2. Pasale el usuario y contraseña admin que creaste en el paso 2.
3. Al ingresar por primera vez, el cliente verá el dashboard con sus colores y nombre, y los datos en cero.
4. **Primeros pasos sugeridos para el cliente**:
   * Ir a `Admin` y configurar los Planes de membresía.
   * Cargar sus Socios (Miembros).
   * Cargar su Inventario (Productos).

---

## ⚠️ Checklist de Producción (Solo la primera vez)
Antes de crear tu primer cliente real en la base de **Producción**, asegúrate de que los índices únicos viejos hayan sido eliminados, de lo contrario dará un `Error 500` al guardar configuraciones.

Para hacerlo, podés correr el script de limpieza en el servidor conectado a producción:
```bash
NODE_ENV=production node scripts/dropLegacyIndexes.js
```
*Este paso ya lo realizamos en tu entorno de desarrollo/local.*
