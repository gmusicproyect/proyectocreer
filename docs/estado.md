# Estado del proyecto

> Leer este archivo antes de trabajar y actualizarlo en el mismo PR que cambie el estado de una tarea.

**Última actualización:** 2026-09-29 · Codex, con el traspaso de Claude y verificación del entorno activo.

## Rama de integración

`codex/layer-01-foundation`. JP decide qué PR se integra.

## Entorno activo

- Repositorio: `gmusicproyect/proyectocreer`.
- Sitio publicado: <https://proyecto-creer.vercel.app>.
- Hosting elegido: Vercel; el despliegue actual se hizo desde CLI.
- Catálogo público: 20 productos reales de presentación, leídos desde Apps Script con la planilla privada.
- Supabase: proyecto `proyecto-creer` en São Paulo, con migración, datos iniciales, RLS y variables configuradas en Vercel.
- Acceso: `/acesso` está publicado; falta crear las cuentas y membresías reales.

## Cambios integrados

| PR | Contenido |
|---|---|
| #1 | Catálogo leído por Apps Script privado, sin CSV público. |
| #2 | Tipografía, tarjetas y navegación de la landing. |
| #3 | Panel conectado en lectura a la planilla privada. |
| #4 | Edición rápida de precio y estado. |
| #5 | Panel operativo: productos, imágenes, categorías, clientes, cotizaciones y costos privados. |
| #6 | Lecturas del panel más estables. |

## Tareas

| # | Tarea | Estado | Próximo resultado |
|---|---|---|---|
| 001 | [Verificar el panel operativo en la planilla real](tareas/001-activar-panel-operativo.md) | En curso | Completar las pruebas de escritura, imágenes, costos y token de lectura. |
| 002 | [Crear el acceso real de Lucas con Supabase](tareas/002-login-lucas-supabase.md) | En curso | Recibir el correo de Lucas, crear su usuario y verificar `tenant_admin`. |
| 003 | [Limitar solicitudes del formulario de cotización](tareas/003-limite-solicitudes-cotizacion.md) | Lista | Implementar límite e honeypot antes de recibir tráfico real. |
| 004 | [Completar la publicación](tareas/004-publicar-sitio.md) | En curso | Conectar despliegue automático, probar una cotización publicada y cerrar 002/003. |

**Orden recomendado:** terminar 002, ejecutar 003, verificar 001 y cerrar 004.

## Decisiones pendientes de JP

1. Correo que usará Lucas y confirmación de que tendrá el rol `tenant_admin`.
2. Permiso de XBZ para el uso público de las fotografías antes de cambiar el catálogo de `presentation` a `published`.
3. Precio y condiciones de la suscripción mensual de Creer.
4. Plan de Vercel adecuado para uso comercial y dominio definitivo.

## Ramas

- Rama activa para esta documentación: `codex/workflow-docs`.
- Integradas y candidatas a borrar después de confirmar que no tienen trabajo exclusivo: `codex/admin-operativo`, `codex/admin-sheets`, `design/landing-tipografia` y `feat/admin-editar-precio-estado`.

## Riesgos conocidos

- La edición todavía depende de las cuotas y disponibilidad de Apps Script.
- Quien recibe acceso directo a la planilla puede ver costos; compartirla solo con personas autorizadas.
- La hoja y Supabase conviven. Supabase gestiona identidad y roles; la hoja sigue siendo la fuente operativa del catálogo durante esta etapa.
- El límite de solicitudes de cotización aún no está implementado.
- Las cuentas reales y la recuperación de contraseña todavía no están probadas.
