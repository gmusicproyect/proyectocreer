# 002 · Crear el acceso real de Lucas con Supabase

- **Estado:** En curso
- **Ejecutor:** JP y Codex
- **Rama:** `codex/login-lucas` solo si la verificación exige cambios de código
- **PR:** —
- **Depende de:** terminar la verificación de escritura de 001

## Objetivo

Permitir que Lucas entre por `/acesso` con su propia cuenta y administre Creer según el rol `tenant_admin`.

## Situación actual

- [x] Proyecto Supabase creado en São Paulo.
- [x] Migración y datos iniciales aplicados: 1 tenant, 6 categorías, 20 productos y 1 suscripción de laboratorio.
- [x] URL y clave publicable configuradas en Vercel.
- [x] `/acesso` publicado y `/admin` protegido sin sesión.
- [ ] Correo de Lucas recibido.
- [ ] Usuario, perfil y membresía `tenant_admin` creados.
- [ ] Acceso y permisos verificados de extremo a extremo.

## Alcance

1. Crear la cuenta de Lucas en Supabase Auth usando el correo confirmado por JP.
2. Crear su perfil y membresía para el tenant `creer` con rol `tenant_admin`.
3. Definir una contraseña inicial mediante un flujo seguro; ninguna contraseña se escribe en GitHub o en la documentación.
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

Confirmar el correo de Lucas y entregar o supervisar la contraseña inicial.
