# Flujo de trabajo con varias IAs

Proyecto Creer se construye con varias personas e IAs sobre el mismo repositorio. Este documento define responsabilidades y un ciclo común para evitar trabajo duplicado o incompatible.

## Roles

| Rol | Responsable | Responsabilidad |
|---|---|---|
| Dueño del producto | JP | Define objetivos y prioridades, aprueba los cambios y decide cuándo se integran en `codex/layer-01-foundation`. |
| Arquitectura y revisión | Claude u otro revisor designado por JP | Convierte objetivos en tareas, revisa el alcance y mantiene decisiones de arquitectura. |
| Ejecución | Codex, Claude u otro colaborador | Implementa una tarea por rama, la valida y abre un PR revisable. |

Los responsables pueden cambiar según la tarea. La regla estable es que cada cambio tiene un alcance escrito y recibe revisión de alguien distinto de quien lo implementó.

## Ciclo de una tarea

1. **Objetivo.** JP define el resultado para el usuario.
2. **Tarea.** Se crea `docs/tareas/NNN-nombre.md` desde `_plantilla.md`, con alcance, exclusiones, validación y pasos manuales.
3. **Ejecución.** El ejecutor parte de `origin/codex/layer-01-foundation`, trabaja en una rama propia y marca la tarea como *En curso*.
4. **PR.** El PR enlaza la tarea, describe el cambio final y registra evidencia útil para revisarlo.
5. **Revisión.** Otro colaborador compara el PR con los criterios de aceptación.
6. **Integración.** JP aprueba la integración. Se marca la tarea como *Hecha* y se registra el PR en `docs/estado.md`.

## Reglas comunes

- Una tarea, una rama y un PR.
- Las ramas de Codex usan `codex/descripcion-corta`. Otros colaboradores usan un prefijo identificable acordado con JP.
- No mezclar cambios ajenos al objetivo. Un hallazgo fuera del alcance se documenta como una tarea nueva.
- No ejecutar en paralelo tareas que modifiquen los mismos archivos.
- La planilla de Gmusic permanece privada.
- Los tokens y contraseñas se guardan en el proveedor correspondiente; nunca se escriben en GitHub, archivos versionados ni mensajes de revisión.
- Los costos solo se consultan mediante una sesión y un rol autorizados.
- Una nueva fuente principal de datos, proveedor o límite de seguridad requiere una ADR en `docs/architecture.md`.

## Nombres y estados

- Rama de integración: `codex/layer-01-foundation`.
- Ramas de Codex: `codex/descripcion-corta`.
- Estados: **Lista → En curso → En revisión → Hecha**, o **Bloqueada** con el motivo.
