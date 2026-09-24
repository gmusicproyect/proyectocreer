# Activación de Supabase

La aplicación ya contiene los clientes de navegador y servidor, renovación de sesión, acceso con correo y contraseña, migración inicial, datos piloto y reglas de acceso por empresa.

## 1. Crear el proyecto

Crear un proyecto en Supabase y guardar estos valores en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
CREER_ADMIN_PREVIEW=false
```

La clave publicable puede estar en el navegador porque la protección real reside en Row Level Security. La `service_role` no debe agregarse a la aplicación web.

## 2. Crear las tablas y cargar el laboratorio

Con Supabase CLI autenticado y el proyecto enlazado:

```bash
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push --include-seed
```

También se puede ejecutar primero `supabase/migrations/20260924000100_initial_creer_schema.sql` y después `supabase/seed.sql` en el SQL Editor de Supabase.

## 3. Crear el primer administrador

Crear el usuario en **Authentication > Users**. Copiar su UUID y ejecutar:

```sql
insert into public.profiles (id, full_name)
values ('UUID_DEL_USUARIO', 'Nombre del administrador')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.memberships (tenant_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000001',
  'UUID_DEL_USUARIO',
  'tenant_admin'
)
on conflict (tenant_id, user_id) do update set role = excluded.role;
```

Para la cuenta del proveedor del software, usar el rol `provider_owner`. Lucas puede usar `tenant_admin`; un vendedor puede usar `sales`; y quien mantenga el catálogo sin ver costos puede usar `catalog_editor`.

## 4. Verificar

Reiniciar la aplicación, abrir `/acesso` e iniciar sesión. `/admin` solo permitirá el acceso si el usuario tiene una membresía activa. Los costos, clientes, cotizaciones y suscripciones quedan protegidos por empresa.

Las pruebas SQL se encuentran en `supabase/tests/rls_policies.test.sql` y se ejecutan con:

```bash
npx supabase test db
```

Antes de publicar el formulario de cotizaciones en Internet se debe agregar límite de solicitudes en la capa web. La función SQL ya valida productos, cantidades y datos básicos, y evita inserciones anónimas directas.
