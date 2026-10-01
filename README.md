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
- Panel operativo sobre la planilla privada: crear y editar productos, subir o asociar imágenes, precios, estados (Pendente, Publicado, Inativo), categorías con renombre en cascada, clientes sin duplicados, situación de cotizaciones y costos internos privados con margen. Permisos por papel en cada operación del servidor y control de conflictos (ver ADR 002).

## Siguiente alcance

Supabase y Vercel ya están activos. El siguiente resultado es crear la cuenta y membresía de Lucas, verificar las operaciones del panel contra la planilla real y proteger el formulario publicado con un límite de solicitudes. El estado y el orden de trabajo se mantienen en [docs/estado.md](docs/estado.md).

Antes de trabajar, leer el [estado del proyecto](docs/estado.md) y el [flujo de trabajo](docs/flujo-de-trabajo.md). Consultar también [instalación del Catálogo Lucas](integrations/google-apps-script/catalogo-lucas/INSTALACION.md), [activación de Supabase](docs/supabase-setup.md), [arquitectura](docs/architecture.md), [modelo comercial](docs/service-model.md) y [siguientes capas](docs/roadmap.md).
