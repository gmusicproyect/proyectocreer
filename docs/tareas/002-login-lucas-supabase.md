# 002 · Crear el acceso real de Lucas con Supabase

- **Estado:** Bloqueada
- **Ejecutor:** JP y Codex
- **Rama:** `codex/login-lucas`
- **PR:** [#8](https://github.com/gmusicproyect/proyectocreer/pull/8) · borrador
- **Depende de:** verificar en conjunto con 001 la escritura, permisos y auditoría; crear la cuenta no requiere terminar 001

## Objetivo

Permitir que Lucas entre por `/acesso` con su propia cuenta y evalúe el panel de la demostración de Creer según el rol `tenant_admin`. JP aclaró el 2026-10-01 que esta prueba en Vercel no es su página oficial; el dominio `.br` queda fuera del alcance.

## Situación actual

- [x] Proyecto Supabase creado en São Paulo.
- [x] Migración y datos iniciales aplicados: 1 tenant, 6 categorías, 20 productos y 1 suscripción de laboratorio.
- [x] URL y clave publicable configuradas en Vercel.
- [x] `/acesso` publicado y `/admin` protegido sin sesión.
- [x] Correo de Lucas recibido y rol `tenant_admin` confirmado por JP.
- [x] Usuario Auth existente, perfil y membresía `tenant_admin` creados y comprobados.
- [ ] Acceso y permisos verificados de extremo a extremo.

## Alcance

1. Crear la cuenta de Lucas en Supabase Auth usando el correo confirmado por JP.
2. Crear su perfil y membresía para el tenant `creer` con rol `tenant_admin`.
3. Definir una contraseña inicial mediante un flujo seguro: implementar solicitud de recuperación y pantalla para definir contraseña, publicarlas y enviar el correo confirmado. Ninguna contraseña se escribe en GitHub o en la documentación.
4. Verificar productos, categorías, clientes, cotizaciones y costos.
5. Confirmar que cada edición llega a la planilla y registra el correo real en `LOGS`.

## Fuera de alcance

- Migrar productos, clientes, cotizaciones o costos desde la planilla a Supabase.
- Construir una pantalla de invitaciones para administradores.

## Criterios de aceptación

- [x] Producción no permite la vista previa administrativa sin autenticación.
- [ ] Lucas inicia sesión y accede al panel de Creer.
- [ ] Lucas puede administrar catálogo, costos, clientes y cotizaciones.
- [ ] Un usuario sin membresía no entra al panel.
- [ ] Las acciones administrativas registran el correo real del usuario.
- [ ] Las pruebas de políticas RLS pasan en un entorno de prueba reproducible.

## Cómo probar

Iniciar sesión en `/acesso` y recorrer `/admin/produtos`, un detalle de producto, `/admin/clientes` y `/admin/orcamentos`. Hacer una modificación reversible y confirmar su registro en la hoja.

## Notas de seguridad

La clave `service_role` no entra en la aplicación web. Los roles se verifican en servidor y las contraseñas las define cada persona mediante un canal seguro.

## Pasos manuales de JP

Lucas define su contraseña mediante la invitación o recuperación de Supabase; no compartirla en chat ni documentación. La prueba debe realizarla Lucas o un operador autorizado con él presente, usando un canal seguro. Si el operador actúa con la sesión de Lucas, documentar expresamente quién ejecutó las acciones: LOGS atribuirá el correo de la sesión.

## Evidencia de ejecución · 2026-10-01

- PR #7 integrado el 2026-10-01 en `b2da99350a367c60cf46043e33e198d1aba6f188` por autorización de JP; documentación revisada originalmente en `codex/workflow-docs`, commit `c6427bf5bd6d8541e3de20f17a9cf735ee107676`.
- Rama de tarea creada desde la integración actualizada, commit `9420bea68572cfa12f9223b137851a7366578622`.
- Migración y seed leídos en GitHub desde `codex/layer-01-foundation`: blobs `c10e0ada5e01eaee9672d9c156e4cce6bc9aae53` y `708b3e7e6e188019c65640e89c47bc52c7e4b103`.
- `profiles` tiene `id`, `full_name` y fechas; no existe trigger de alta de perfil. `memberships` tiene unicidad `(tenant_id, user_id)` y acepta `tenant_admin`. El seed identifica la empresa por slug `creer`.
- Panel Supabase accesible. SELECT previo devolvió una fila para Lucas, perfil ausente, tenant `creer` activo y rol NULL.
- JP confirmó la ejecución. La transacción de creación terminó con `Success. No rows returned`; el panel no mostró los contadores individuales de INSERT.
- SELECT posterior devolvió exactamente una fila: perfil existente, slug `creer`, tenant activo y rol `tenant_admin`. No se hardcodearon UUIDs ni se cambió el esquema.
- Producción muestra `/acesso`. Abrir `/admin` sin sesión redirige a `/acesso?erro=acesso` y muestra denegación de acceso. Esta prueba no demuestra el caso de usuario autenticado sin membresía.
- Bloqueo exacto: falta una sesión real de Lucas en el navegador de producción. No se solicitaron ni copiaron contraseñas. No se probaron todavía operaciones del panel, edición reversible, LOGS, usuario autenticado sin membresía ni RLS reproducible.
- La tarea sigue Bloqueada, sin cierre de criterios pendientes. Revisión por otra persona e integración decidida por JP. Este PR modifica solo los dos documentos de 002 sobre la integración de #7. Los conflictos add/add se resolvieron conservando la versión actualizada de #8; falta la revisión del diff final antes de integrar.

## Continuación y evidencia requerida

1. Auth ya existe; no crear una cuenta duplicada. Verificar con Lucas si completó su acceso; si necesita recuperación, usar el flujo seguro de Supabase.
2. El alta ya se ejecutó. SQL utilizado, con el correo personal sustituido por un marcador para la documentación pública (no ejecutar tal cual ni repetir: las filas existen):

```sql
begin;
do $$
begin
  if (select count(*) from auth.users where email = '<correo confirmado por JP>') <> 1
    or (select count(*) from public.tenants where slug = 'creer' and active) <> 1 then
    raise exception 'Se requiere exactamente un usuario y un tenant activo';
  end if;
end $$;
insert into public.profiles (id, full_name)
select id, 'Lucas'
from auth.users
where email = '<correo confirmado por JP>';

insert into public.memberships (tenant_id, user_id, role)
select t.id, u.id, 'tenant_admin'::public.membership_role
from public.tenants t
cross join auth.users u
where t.slug = 'creer' and t.active and u.email = '<correo confirmado por JP>';
commit;
```

La comprobación previa exige exactamente un usuario y un tenant activo. La transacción finalizó sin errores y el SELECT posterior confirmó el perfil y el rol. No fijar UUIDs manualmente.

3. Ya comprobado: perfil y membresía mediante joins de `profiles.id` y `memberships.user_id` con `auth.users.id`, y `memberships.tenant_id` con `tenants.id`; filtrar por correo confirmado y slug `creer`. Registrar solo existencia, rol y resultado, sin credenciales ni costos.
4. Con sesión real de Lucas en producción: entrar por `/acesso` a `/admin`, operar productos/categorías, clientes y cotizaciones, y comprobar lectura/edición autorizada de costos sin divulgarlos.
5. Elegir un campo reversible de un registro de prueba, anotar su valor original en el entorno privado, cambiarlo y restaurarlo. Comprobar persistencia y ambas entradas en `LOGS` con el correo de Lucas; registrar fecha, entidad y resultado sin datos sensibles. Esta evidencia también aporta al cierre de 001, sin dar por verificadas imágenes ni token de lectura.
6. Con un usuario de prueba sin membresía y una sesión separada, verificar denegación del panel y de lecturas/escrituras administrativas. No confundir esto con un visitante sin sesión. Usar una cuenta de prueba dedicada sin membresía y eliminarla al terminar según el procedimiento autorizado, sin reutilizar la cuenta de Lucas. Comprobar RLS en un entorno reproducible.
7. Actualizar este archivo y `docs/estado.md` en el mismo PR; marcar únicamente criterios demostrados y mantener pendientes los demás.

## Revisión del borrador

Claude realizó la revisión independiente del commit `c0f5768`; JP la trasladó al chat. La revisión está publicada como [comentario del PR #8](https://github.com/gmusicproyect/proyectocreer/pull/8#issuecomment-5938838775), sin aprobación formal. JP decide la integración.

Se retiró el correo personal del SQL público y se reescribieron los commits propios de esta rama. La sustitución no garantiza eliminar copias o referencias históricas conservadas por GitHub. Se corrigieron la atribución de la revisión y la frase sobre el navegador. Estos ajustes posteriores al commit revisado requieren nueva revisión.

PR #7 integrado por autorización de JP el 2026-10-01. Esta rama incorpora `codex/layer-01-foundation`; los conflictos de ambos documentos se resolvieron conservando la evidencia y el estado de #8 y actualizando las referencias a #7. Revisar nuevamente el diff final. El PR continúa en borrador y las pruebas de producción siguen pendientes.

## Contraseña por correo · 2026-10-01

JP solicitó completar y publicar el flujo y enviar el correo a Lucas. Se implementaron `/acesso/recuperar`, `/acesso/nova-senha` y el enlace desde `/acesso`. El correo usa Supabase Auth y la URL exacta de producción; puede abrirse en otro dispositivo sin depender del verificador PKCE del remitente. La pantalla elimina el fragmento con credenciales antes de verificar la sesión, comprueba identidad con Supabase y guarda la contraseña mediante una acción de servidor autenticada. Después cierra la sesión y vuelve al acceso. Los enlaces por token hash de recuperación/invitación también conducen a la pantalla de contraseña; los destinos están limitados a rutas internas conocidas.

- Lint, tipos, 44 pruebas y compilación local con Webpack pasan. Turbopack local quedó bloqueado por el entorno; no se declara su compilación exitosa.
- Supabase: Site URL corregida desde localhost a `https://proyecto-creer.vercel.app`; allowlist con URL exacta `/acesso/nova-senha`, sin comodines. Persistencia comprobada al recargar.
- SMTP propio desactivado; la solicitud puntual para Lucas fue aceptada y registrada. El servicio predeterminado restringe destinatarios a miembros del equipo del proyecto según [Supabase](https://supabase.com/docs/guides/auth/auth-smtp). No conceder acceso al proyecto a Lucas para sortear esta restricción.
- Publicado en la demostración `https://proyecto-creer.vercel.app`, despliegue [AjnyjeTKFM5F4gixcFkHKKXq8XG5](https://vercel.com/gmusicproyects-projects/proyecto-creer/AjnyjeTKFM5F4gixcFkHKKXq8XG5), código `a94a0e0`. La primera publicación falló por credencial vencida; tras renovar la sesión, Vercel confirmó READY. Compilación remota con Turbopack exitosa.
- Una solicitud de recuperación para el correo confirmado fue aceptada sin error desde la pantalla publicada. SELECT privado de `auth.users` devolvió una fila con `recovery_requested=true` y `recovery_sent_at` correspondiente a 2026-10-01 16:43:25 (America/Santiago). No se copian correo ni credenciales en la evidencia pública. Esto confirma el registro en Supabase, no recepción en la bandeja de Lucas.
- Navegador: `/acesso` muestra el enlace de creación/recuperación; `/acesso/recuperar` muestra confirmación genérica después de solicitar el correo; `/acesso/nova-senha` sin sesión/enlace válido rechaza el acceso al formulario; callback incompleto redirige a la solicitud con aviso de enlace inválido.
- No se conoce, modifica ni solicita la contraseña de Lucas. Las pruebas de actualización usan un proveedor simulado; no sustituyen la aceptación del correo y definición de contraseña por Lucas. Pendientes: abrir el correo, definir contraseña e iniciar sesión, operaciones del panel, edición/restauración y LOGS, usuario autenticado sin membresía y RLS real.
