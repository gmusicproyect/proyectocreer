# 005 · Ayuda contextual del panel

- **Estado:** En revisión
- **Ejecutor:** Codex
- **Rama:** `codex/ayuda-panel`
- **PR:** pendiente
- **Depende de:** ninguna

## Objetivo
Dar a Lucas instrucciones breves en portugués dentro de cada sección, mediante un control circular de ayuda.

## Alcance
Visión general, productos y ficha, categorías, clientes, orçamentos, equipo y suscripción. Ayuda desplegable con teclado y en móvil, sin cambiar datos ni permisos.

## Fuera de alcance
Publicación, login y verificación de escritura real en Google (001/002).

## Criterios de aceptación
- [x] Control circular con nombre accesible en cada sección.
- [x] Texto coherente con las funciones disponibles y los pasos de imágenes.
- [x] Apertura/cierre con teclado y comprobación visual.
- [x] Lint y tipos sin errores.

## Cómo probar
Abrir cada sección de /admin, activar el signo de interrogación y volver a cerrarlo. En productos, comprobar también una ficha y el alta. Equipo explica que muestra permisos y no asigna usuarios.

## Notas de seguridad
Ayuda estática: no consulta datos adicionales ni modifica permisos.

## Pasos manuales de JP
Revisión por otra persona e integración cuando JP la decida.

## Evidencia · 2026-10-01

Ayuda abierta en las siete secciones y en alta de producto, comprobada en navegador con datos simulados. Productos abre/cierra con Enter/Espacio. Lint, tipos, compilación de producción y diff sin errores. Validación móvil pendiente del revisor. No se probó escritura real ni se publicó este cambio.
