# Proyecto Creer — Capa 01

Fundación SaaS para catálogo B2B de regalos corporativos y cotizaciones. Interfaz en portugués (Brasil), moneda BRL, basada en la referencia Creer facilitada por el propietario.

## Ejecutar

Node.js 24 LTS y npm. Desde este directorio:

```sh
npm ci
npm run dev
```

Abrir http://localhost:3000. Para explorar el panel localmente sin una base conectada:

```sh
CREER_ADMIN_PREVIEW=true npm run dev
```

Visitar `/acesso` y entrar a la vista previa. La bandera nunca habilita el panel en producción. No hay usuarios ni contraseñas predeterminadas.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Entregado

- Next.js App Router, TypeScript estricto, Tailwind CSS 4 y tokens visuales compartidos.
- Inicio, catálogo vacío con búsqueda, selección vacía de cotización, acceso y 404.
- Panel local navegable: resumen, productos, categorías, clientes, cotizaciones, equipo/permisos y suscripción.
- Colección de presentación conectada a Google Sheets con 20 productos reales,
  imágenes de Drive, filtros, ficha, cantidad y personalización.
- Flujo local de solicitud de cotización y recepción simulada en el panel.
- Contratos de entidades y política de permisos por empresa; proyección pública que excluye costos.
- Integración Supabase preparada: sesión segura, login/logout, confirmación de correo y acceso administrativo por membresía.
- Migración con empresas, perfiles, roles, categorías, productos, costos privados, clientes, cotizaciones, suscripción y auditoría.
- Row Level Security, permisos SQL, almacenamiento de imágenes y prueba base de aislamiento.
- Carga inicial de los 20 productos y registro persistente de solicitudes cuando Supabase está conectado.
- Módulo instalado de Google Sheets + Apps Script para que Lucas importe imágenes
  desde Drive, complete productos y publique el catálogo sin duplicados.
- Acceso administrativo cerrado por defecto; el modo local queda deshabilitado en producción.

## Siguiente alcance

Crear o enlazar el proyecto Supabase, aplicar la migración y registrar los primeros usuarios. Después corresponde implementar el CRUD visual de productos, categorías, costos y clientes; carga de imágenes desde el panel; edición del estado y precio de cotizaciones; facturación y publicación. Sin credenciales de Supabase, el laboratorio conserva carrito y solicitudes en `localStorage`.

Consultar [instalación del Catálogo Lucas](integrations/google-apps-script/catalogo-lucas/INSTALACION.md), [activación de Supabase](docs/supabase-setup.md), [arquitectura](docs/architecture.md), [modelo comercial](docs/service-model.md) y [siguientes capas](docs/roadmap.md).
