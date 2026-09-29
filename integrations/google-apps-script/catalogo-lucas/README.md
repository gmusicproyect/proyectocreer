# Catálogo Lucas para Google Apps Script

Este directorio conserva los nueve archivos instalables recibidos en `catalogo-lucas.zip` y agrega `Cotizaciones.gs`, con correcciones para los códigos reales del catálogo Creer, validaciones defensivas de publicación y recepción segura de solicitudes desde la web.

## Papel dentro de Proyecto Creer

Google Sheets y Drive funcionan como área de carga y mantenimiento del catálogo para Lucas. Durante el laboratorio, la misma hoja también recibe clientes y cotizaciones en pestañas separadas. Supabase continúa preparado para la evolución del SaaS: usuarios, permisos, costos privados, suscripciones y auditoría avanzada.

El endpoint público de Apps Script solo entrega productos publicados. El receptor de cotizaciones acepta solicitudes únicamente cuando incluyen el token privado configurado en Apps Script. `PRECIO` es el precio de venta: los costos internos viven en la pestaña privada `COSTOS` (ver ADR 002) y nunca pasan por la API pública.

`AdminWeb.gs` recibe las escrituras del panel web con un token de administración propio (`ADMIN_WRITE_TOKEN`). Activación y reglas: sección 11 de `INSTALACION.md`.

## Verificación local

Desde la raíz de `proyectocreer`:

```bash
npm run test:catalog-importer
```

`tests/planilha-simulada.mjs` ejecuta los `.gs` reales sobre una planilla en memoria; lo usan `tests/admin-web.test.mjs` y el servidor local `dev/servidor-simulado.mjs`.

Estas pruebas verifican la lógica portable incluida en la entrega. La prueba definitiva de permisos, Drive, triggers y hojas requiere instalar el proyecto en una cuenta real de Google siguiendo `INSTALACION.md`.

## Correcciones aplicadas a la entrega

- Se permite `@` en códigos porque el catálogo Creer contiene `P@14962`.
- Se rechazan fórmulas también en el campo de precio.
- Publicar exige descripción, en concordancia con la detección de productos incompletos.
- La API excluye categorías inexistentes o inactivas y productos publicados manualmente con datos incompletos.
- Las cotizaciones se guardan en `CLIENTES`, `COTIZACIONES` y `COTIZACION_ITEMS`; un correo existente actualiza el cliente en lugar de duplicarlo.
- El token de recepción vive en Propiedades del script y en el servidor web. Nunca se incluye en el repositorio ni se envía al navegador.
