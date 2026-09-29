# ADR 001 · Fundación de Creer

Estado: adoptado para Capa 01.

## Decisión

Monolito modular Next.js App Router + TypeScript + Tailwind CSS. Componentes de servidor por defecto; solo la búsqueda vacía necesita estado del navegador. CSS compartido define café, marfil, líneas sutiles y tipografía serif para títulos. No se añaden fuentes remotas ni dependencias de imágenes externas. La referencia inspira la identidad, no se incrusta como interfaz ni se copia una plantilla.

Supabase PostgreSQL, Auth y Storage forman la capa de persistencia/autenticación. La migración vive en `supabase/migrations`; la carga piloto está en `supabase/seed.sql`. Vercel es el destino previsto, no provisionado. No usar Apps Script como frontend: las rutas públicas y la separación de autorización requieren una base web extensible. No introducir microservicios en esta etapa.

Google Sheets y Drive pueden funcionar como área de carga del catálogo para Lucas. El módulo Apps Script importa imágenes, permite completar productos y expone únicamente la proyección pública. Esa hoja no almacena permisos ni suscripciones. Desde la Capa 02 guarda clientes y cotizaciones, y desde la ADR 002 también los costos internos, en pestañas separadas que la proyección pública nunca lee. En producción, el catálogo publicado se sincroniza hacia Supabase para conservar una sola base operativa y evitar que la disponibilidad de la web dependa de Apps Script.

## Estructura

- `src/app`: rutas y composición de páginas.
- `src/components`: identidad y componentes compartidos.
- `src/modules/catalog`: experiencia pública y futuras consultas publicadas.
- `src/modules/admin`: navegación del panel.
- `src/modules/auth`: acceso cerrado y política de permisos.
- `src/modules/{products,categories,customers,quotations,subscriptions}`: contratos de dominio.
- `supabase`: migraciones, datos piloto y pruebas de políticas.
- `integrations/google-apps-script/catalogo-lucas`: panel e importador de Drive para la gestión del catálogo en Sheets.
- `docs`: decisiones, modelo y evolución.
- `tests`: límites de autorización y proyección pública.

## Límites de datos

Toda entidad comercial lleva tenantId. Membresías verificadas en servidor determinan empresa y rol; nunca aceptar rol/tenant del navegador como autorización. Los importes se almacenarán en centavos enteros BRL. Las cotizaciones conservarán nombre, SKU y precio acordados como instantánea de cada línea.

Los costos irán en una tabla privada separada de productos. El catálogo leerá una vista/proyección explícita de productos publicados: nada de `select *`. `toPublicProduct` es la lista permitida, no una comprobación de publicación: la consulta futura debe filtrar tenant y published antes de proyectar. Clientes, costos, cotizaciones y suscripciones nunca se precargan en el catálogo público.

Supabase aplica RLS por tenant y rol. La clave publicable solo obtiene lo que permiten las políticas y no se utiliza una clave `service_role` en la aplicación. La propiedad técnica no implica acceso comercial automático: soporte excepcional requerirá autorización explícita y auditoría.

## Autenticación

`/admin/**` valida una sesión de Supabase y una membresía antes de mostrar datos. `src/proxy.ts` actualiza las cookies de sesión; la autorización final ocurre nuevamente en servidor y en RLS. Solo `NODE_ENV=development` más `CREER_ADMIN_PREVIEW=true` permite la demostración local. Producción ignora esa bandera.

## Fuentes técnicas

- https://nextjs.org/docs/app/getting-started/server-and-client-components
- https://nextjs.org/docs/app/guides/authentication

## Alternativas

SPA separada de API: agrega dos despliegues sin necesidad actual. Apps Script: no elegido para frontend principal. La base queda versionada en el repositorio y se activa cuando exista un proyecto Supabase; no se inventan credenciales ni recursos externos.


# ADR 002 · Panel operativo sobre la planilla privada

Estado: adoptado (septiembre 2026).

## Contexto

Lucas necesita operar el catálogo desde el panel (`/admin`): productos, imágenes, precios, categorías, clientes, cotizaciones y costos. Supabase sigue sin proyecto remoto. Mientras tanto, la planilla de Gmusic ya es **privada** (acceso restringido y lectura solo mediante Apps Script con token desde el servidor). La regla original, “la hoja no almacena costos”, se escribió cuando la hoja se publicaba como CSV.

## Decisión

1. **El panel escribe en la planilla a través de Apps Script** (`AdminWeb.gs`), con un token de administración (`ADMIN_WRITE_TOKEN` / `GOOGLE_ADMIN_WRITE_TOKEN`) separado del token de lectura y cotizaciones. Next valida los datos y el permiso del papel en cada server action. Apps Script vuelve a validar todo y registra en LOGS quién hizo cada cambio.
2. **Costos en la pestaña `COSTOS` de la misma planilla privada.** Solo se leen con el token de administración (`admin_costos`), nunca en `admin_datos` ni en el catálogo, y el servidor solo los pide para papeles con `costs:read` (hoy, `tenant_admin`).
3. **Control de conflictos optimista:** productos por `FECHA_ACTUALIZACION` (el disparador `onEdit` la actualiza también cuando se edita a mano); categorías, clientes, cotizaciones y costos por un resumen (hash) de la fila. Un guardado basado en datos viejos se rechaza y el panel recarga.
4. **El navegador nunca maneja IDs de Drive:** las imágenes viajan como acciones (`mantener`, `quitar`, link de Drive o archivo subido). Solo recibe las URLs públicas de las imágenes.
5. **Estados:** el panel ofrece Pendente, Publicado e Inativo (`OCULTO` en la hoja, para no romper el importador ni las validaciones existentes).

## Consecuencias

- Quien tenga acceso a la planilla ve los costos: la planilla solo se comparte con personas que pueden conocerlos. En el panel, el papel decide.
- La disponibilidad de la edición depende de Apps Script (cuotas de Google, ~30 s por operación como máximo).
- Al conectar Supabase, `COSTOS` se migra a `product_costs` (misma forma: código, costo, proveedor, notas) y el panel cambia de fuente sin cambiar la interfaz. Las acciones del servidor ya separan permiso, validación y persistencia para facilitar ese cambio.

## Alternativa descartada

Esperar Supabase para costos y edición: bloqueaba el trabajo de Lucas sin mejorar la seguridad actual, porque la planilla ya es privada y el acceso pasa por el servidor.
