# ADR 001 · Fundación de Creer

Estado: adoptado para Capa 01.

## Decisión

Monolito modular Next.js App Router + TypeScript + Tailwind CSS. Componentes de servidor por defecto; solo la búsqueda vacía necesita estado del navegador. CSS compartido define café, marfil, líneas sutiles y tipografía serif para títulos. No se añaden fuentes remotas ni dependencias de imágenes externas. La referencia inspira la identidad, no se incrusta como interfaz ni se copia una plantilla.

Supabase PostgreSQL, Auth y Storage forman la capa de persistencia/autenticación. La migración vive en `supabase/migrations`; la carga piloto está en `supabase/seed.sql`. Vercel es el destino previsto, no provisionado. No usar Apps Script como frontend: las rutas públicas y la separación de autorización requieren una base web extensible. No introducir microservicios en esta etapa.

Google Sheets y Drive pueden funcionar como área de carga del catálogo para Lucas. El módulo Apps Script importa imágenes, permite completar productos y expone únicamente la proyección pública. Esa hoja no almacena costos, clientes, cotizaciones, permisos ni suscripciones. En producción, el catálogo publicado se sincroniza hacia Supabase para conservar una sola base operativa y evitar que la disponibilidad de la web dependa de Apps Script.

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
