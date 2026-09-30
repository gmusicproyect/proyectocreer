# 001 · Verificar el panel operativo en la planilla real

- **Estado:** En curso
- **Ejecutor:** JP con apoyo de Codex o Claude
- **Rama:** no requiere código salvo que una prueba encuentre un defecto
- **PR:** —
- **Depende de:** ninguna

## Objetivo

Confirmar que la versión instalada de Apps Script permite operar la planilla privada de Gmusic desde el panel publicado sin exponer tokens ni costos.

## Situación actual

Los archivos del panel operativo, los tokens del servidor y la implementación de Apps Script ya fueron configurados durante la instalación. El catálogo publicado lee 20 productos desde la planilla privada. Faltan pruebas finales de escritura y autorización para cerrar la tarea.

## Alcance

1. Verificar que `COSTOS`, las columnas administrativas de `COTIZACIONES` y `DRIVE_UPLOAD_ID` existen.
2. Cambiar un precio de prueba desde `/admin` y comprobar la planilla y `LOGS`.
3. Subir una imagen de prueba y comprobar Drive y el catálogo.
4. Guardar un costo y confirmar que no aparece en `/catalogo` ni en su HTML público.
5. Confirmar que el token de lectura no puede ejecutar `admin_costos`.

## Fuera de alcance

- Cambios funcionales nuevos.
- Migrar la fuente operativa desde Sheets a Supabase.

## Criterios de aceptación

- [ ] La estructura administrativa de la hoja está completa.
- [ ] Precio, imagen y costo se guardan desde un usuario autorizado.
- [ ] `LOGS` registra el correo del autor.
- [ ] El catálogo público no expone costos.
- [ ] El token de lectura no autoriza operaciones administrativas.

## Cómo probar

Seguir la sección 11 de `integrations/google-apps-script/catalogo-lucas/INSTALACION.md` usando un producto de prueba.

## Notas de seguridad

No copiar tokens en GitHub ni en la documentación. La planilla permanece restringida.

## Pasos manuales de JP

Realizar o autorizar las pruebas que modifican la planilla y Drive reales.
