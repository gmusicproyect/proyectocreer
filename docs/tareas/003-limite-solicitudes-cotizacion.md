# 003 · Limitar solicitudes del formulario de cotización

- **Estado:** Lista
- **Ejecutor:** Codex
- **Rama:** `codex/quote-rate-limit`
- **PR:** —
- **Depende de:** ninguna

## Objetivo

Impedir que envíos automatizados llenen la planilla con cotizaciones distintas. La deduplicación actual evita reintentos repetidos, pero no limita solicitudes nuevas.

## Alcance

1. Limitar `/api/quotes` por IP a 5 solicitudes cada 10 minutos y aplicar un tope global razonable.
2. Responder `429` con un mensaje claro en portugués y mostrarlo en la interfaz.
3. Añadir un campo trampa invisible. Si llega lleno, responder como éxito sin registrar la solicitud.
4. Cubrir la lógica con pruebas deterministas sin red.

## Fuera de alcance

- CAPTCHA o servicios externos.
- Cambios en Apps Script o el panel administrativo.

## Archivos previstos

- `src/app/api/quotes/route.ts`
- `src/lib/quotes/rate-limit.ts`
- `src/modules/quotations/quote-builder.tsx`
- `tests/quote-rate-limit.test.ts`

## Criterios de aceptación

- [ ] La sexta solicitud de una IP en 10 minutos recibe `429` y no llega a Apps Script.
- [ ] El honeypot evita la escritura y conserva una respuesta indistinguible para un bot.
- [ ] Los reintentos normales mantienen la misma referencia y no crean duplicados.
- [ ] La IP se obtiene defensivamente del primer valor válido de `x-forwarded-for`; sin IP se aplica el límite global.
- [ ] Lint, tipos, pruebas y compilación pasan.

## Cómo probar

Ejecutar las pruebas unitarias y, con `dev/servidor-simulado.mjs`, enviar seis solicitudes equivalentes desde una IP de prueba.

## Notas de seguridad

Un límite en memoria se reinicia con cada despliegue y no se comparte entre instancias. Es una primera barrera; si el tráfico crece deberá migrarse a almacenamiento compartido.

## Pasos manuales de JP

Ninguno.
