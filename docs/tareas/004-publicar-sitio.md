# 004 · Completar la publicación para Lucas

- **Estado:** En curso
- **Ejecutor:** JP y Codex
- **Rama:** `codex/production-readiness` solo si se necesitan cambios de repositorio
- **PR:** —
- **Depende de:** 002 y 003; la prueba administrativa también depende de 001

## Objetivo

Cerrar la publicación ya iniciada en Vercel y verificar el recorrido completo antes de que Lucas use datos reales.

## Situación actual

- [x] Vercel elegido como hosting.
- [x] Sitio accesible por HTTPS en <https://proyecto-creer.vercel.app>.
- [x] Variables de Google y Supabase configuradas como secretos o configuración del proyecto.
- [x] Catálogo conectado a la planilla privada y modo `presentation` activo.
- [ ] Despliegue automático conectado a la rama de integración.
- [ ] Login real de Lucas probado.
- [ ] Límite de cotizaciones implementado.
- [ ] Cotización publicada verificada de extremo a extremo.

## Alcance

1. Conectar Vercel con la rama `codex/layer-01-foundation` para desplegar cambios aprobados.
2. Cerrar las tareas 001, 002 y 003.
3. Verificar `/`, `/catalogo`, `/orcamento`, `/acesso` y `/admin` en el sitio publicado.
4. Enviar una cotización de prueba y comprobar su llegada a la planilla.
5. Definir dominio y plan de Vercel para la operación comercial.
6. Cambiar de `presentation` a `published` solo después de que JP y Lucas confirmen precios, contenido y permiso de imágenes.

## Fuera de alcance

- Facturación de la suscripción.
- Migración completa desde Sheets hacia Supabase.

## Criterios de aceptación

- [ ] Las rutas públicas y privadas responden por HTTPS.
- [ ] `/admin` exige sesión y Lucas entra con su membresía.
- [ ] El HTML público no contiene tokens, costos ni identificadores privados de Drive.
- [ ] Una cotización llega a la planilla una sola vez.
- [ ] Un cambio integrado se despliega automáticamente.
- [ ] Plan, dominio y modo de catálogo están documentados.

## Notas de seguridad

Las variables permanecen en Vercel y nunca se versionan. Confirmar el permiso de las imágenes antes de abrir el catálogo definitivo.

## Pasos manuales de JP

Confirmar el plan comercial, el dominio definitivo y la fecha de apertura con Lucas.
