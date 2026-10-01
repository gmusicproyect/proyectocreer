<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Proyecto Creer · Reglas para colaboradores e IAs

Antes de escribir código:

1. Lee `docs/estado.md` para conocer lo terminado, lo que está en curso y los bloqueos.
2. Trabaja solo en una tarea de `docs/tareas/`. Si el objetivo todavía no está escrito, documéntalo antes de implementar.
3. Crea una rama desde `origin/codex/layer-01-foundation` actualizada. Usa `codex/descripcion-corta` para trabajo de Codex y evita modificar ramas de otros colaboradores.
4. Abre un PR que cite la tarea, explique el resultado y registre las validaciones relevantes. Actualiza `docs/estado.md` en el mismo PR.

JP decide las prioridades y aprueba la integración en `codex/layer-01-foundation`. El código debe recibir revisión de alguien distinto de quien lo escribió.

Seguridad sin excepciones: la planilla permanece privada, ningún token llega al navegador ni al repositorio y los costos solo aparecen ante un usuario autorizado. Los cambios de arquitectura se documentan como ADR en `docs/architecture.md`. El flujo completo está en `docs/flujo-de-trabajo.md`.
