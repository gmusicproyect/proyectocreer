# 005 · Ayuda contextual del panel

- **Estado:** En revisión
- **Ejecutor:** Codex; ajustes de texto de Claude tras su revisión, autorizados por JP
- **Rama:** `codex/ayuda-panel`
- **PR:** [#9](https://github.com/gmusicproyect/proyectocreer/pull/9)
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

Ayuda abierta en las siete secciones y en alta de producto, comprobada en navegador con datos simulados. Productos abre/cierra con Enter/Espacio. Lint, tipos, compilación de producción y diff sin errores. No se probó escritura real ni se publicó este cambio.

## Revisión de Claude · 2026-10-01

Revisión del commit `4874981`, publicada como comentario en el PR #9.

- Móvil (Chromium, iPhone 13 emulado, datos simulados): las ocho pantallas abren y cierran la ayuda con un toque; control de 40×40 px, sin desplazamiento horizontal, contenido a todo el ancho. Clientes abre/cierra con Enter/Espacio y el control expone su nombre accesible. No se probó Safari ni VoiceOver en un iPhone real.
- Ajustes de texto aplicados por Claude con autorización de JP, para que coincidan con los controles reales:
  - Orçamentos: «andamento» y «detalhes» no existen en pantalla; ahora nombra **Atualizar situação** y las notas internas.
  - Cierre: «Clique» pasa a «Toque ou clique» para móvil.
  - Clientes y Categorias: nombran **+ Novo cliente**, **+ Nova categoria** y **Editar**; se añaden la regla de e-mail único y el renombre en cascada.
  - Produtos: enviar otra foto al mismo espacio la reemplaza; Pendente ya no sugiere que oculta el producto (en modo `presentation` aparece en el catálogo sin precio); costos en la sección **Custo interno**.
- Segundo ajuste, pedido por JP: la ayuda debe ser práctica para Lucas. Cada sección empieza con **«Preciso fazer algo aqui?»** y una respuesta directa («Não» en Visão geral, Equipe y Assinatura; «Sim» o «Só se» en las demás). Siguen pasos cortos con los nombres exactos de los botones. Orçamentos aclara que el panel no envía mensajes y que Lucas responde por e-mail o teléfono.
- Como Claude modificó el texto, estos ajustes necesitan revisión de otra persona (Codex o quien designe JP) antes de integrar.

## Pendiente

- Comprobar el «?» una vez en un iPhone real (Safari).
- Al integrar #8 o #9, el segundo tendrá conflicto en `docs/estado.md` (fecha y tabla de tareas); resolverlo conservando ambas filas.
