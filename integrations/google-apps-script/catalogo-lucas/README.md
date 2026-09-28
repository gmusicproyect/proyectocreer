# Catálogo Lucas para Google Apps Script

Este directorio conserva los nueve archivos instalables recibidos en `catalogo-lucas.zip`, con correcciones para los códigos reales del catálogo Creer y validaciones defensivas de publicación.

## Papel dentro de Proyecto Creer

Google Sheets y Drive funcionan como área de carga y mantenimiento del catálogo para Lucas. Supabase continúa siendo la base operativa del SaaS para usuarios, permisos, costos privados, clientes, cotizaciones, suscripciones y auditoría.

El endpoint público de Apps Script solo debe entregar productos publicados. La aplicación web podrá sincronizar esa salida hacia Supabase; no se deben guardar costos ni información privada en `PRECIO` o en la API pública.

## Verificación local

Desde la raíz de `proyectocreer`:

```bash
npm run test:catalog-importer
```

Estas pruebas verifican la lógica portable incluida en la entrega. La prueba definitiva de permisos, Drive, triggers y hojas requiere instalar el proyecto en una cuenta real de Google siguiendo `INSTALACION.md`.

## Correcciones aplicadas a la entrega

- Se permite `@` en códigos porque el catálogo Creer contiene `P@14962`.
- Se rechazan fórmulas también en el campo de precio.
- Publicar exige descripción, en concordancia con la detección de productos incompletos.
- La API excluye categorías inexistentes o inactivas y productos publicados manualmente con datos incompletos.
