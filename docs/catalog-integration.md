# Catálogo conectado · Capa 02

La web pide el catálogo a la aplicación web de Apps Script (`doPost` con
`accion: "catalogo"`) desde el servidor de Next.js, con el mismo token privado
que usan las cotizaciones. La planilla debe quedar **privada**: ya no se usa la
salida CSV pública de Google, que obligaba a compartir toda la hoja (clientes,
cotizaciones y costos) con cualquier persona que tuviera el enlace. La lectura
se actualiza como máximo cada cinco minutos. El navegador recibe únicamente la
proyección pública: código, nombre, categoría, subcategoría, descripción,
precio, moneda, imágenes y estado.

CREER_CATALOG_MODE=presentation permite mostrar PENDIENTE y PUBLICADO durante
el laboratorio, con “Sob consulta” cuando el precio está vacío. Antes de abrir
el sitio definitivo debe usarse published; así la web solo muestra filas
completas que Lucas haya marcado como PUBLICADO.

Si Apps Script no responde o no está configurado, la presentación conserva una copia segura de los
20 productos seleccionados. Los costos, observaciones, identificadores de
carpeta, fechas e información de importación nunca forman parte del objeto que
se entrega a la interfaz.

El flujo de cotización permite elegir producto, acabado, cantidad y
personalización. Si la aplicación web de Apps Script y su token están
configurados, /api/quotes registra el cliente y la solicitud en CLIENTES,
COTIZACIONES y COTIZACION_ITEMS. Supabase sigue disponible como segunda opción.
Sin ninguna persistencia configurada, el laboratorio conserva las solicitudes
en el navegador.

Cada envío lleva una clave estable generada por el navegador. Si Google termina
de guardar después de que la web agota su espera y el usuario reintenta, Apps
Script devuelve la referencia ya creada en vez de duplicar la cotización.

Una solicitud pública nunca modifica los datos de un cliente existente: si el
correo ya está en CLIENTES, solo se completan campos vacíos, y lo que la
persona escribió queda copiado en la propia cotización (columnas CONTACTO_*).
Así nadie puede cambiar el teléfono de un cliente conociendo solo su correo.

El panel administrativo consulta `admin_datos` desde un componente de servidor,
después de validar la sesión administrativa. El token permanece en el servidor
y Apps Script no guarda en caché la respuesta privada. La web conserva una
copia en memoria durante 15 segundos para que la navegación del panel sea ágil.
Productos, categorías, clientes y
cotizaciones se muestran desde la planilla; el navegador nunca recibe IDs de
Drive, la configuración de Apps Script ni el token de conexión.

## Checklist de despliegue

1. Pegar en Apps Script los archivos actualizados de
   `integrations/google-apps-script/catalogo-lucas/`.
2. Ejecutar **CATÁLOGO LUCAS → Sistema → Inicializar / reparar hojas** (agrega
   las columnas CONTACTO_* en COTIZACIONES).
3. **Implementar → Gestionar implementaciones → editar → Nueva versión** (la
   URL `/exec` no cambia).
4. Verificar que la web muestra el catálogo real.
5. Recién entonces, en la planilla: **Compartir → Acceso general → Restringido**.

## Edición desde el panel

- El panel envía `{ accion: "admin_actualizar_producto" }` a Apps Script con un
  **token de escritura propio** (`ADMIN_WRITE_TOKEN` en Propiedades del script y
  `GOOGLE_ADMIN_WRITE_TOKEN` en el servidor). El token de lectura/cotizaciones no
  sirve para escribir.
- Next revisa en el servidor, en cada guardado: sesión, rol con `catalog:write`
  (tenant_admin o catalog_editor) y que la cuenta pertenezca al tenant dueño de
  la planilla (`CREER_TENANT_SLUG`, por defecto `creer`). Miembros de otro
  tenant tampoco ven clientes ni cotizaciones.
- Apps Script reutiliza la validación de `Productos.gs` (reglas para publicar,
  precio válido) y registra en LOGS el email de quien editó.
- Control de conflictos: el panel envía la `FECHA_ACTUALIZACION` que vio. Si la
  fila cambió (otra persona o edición directa en la hoja, gracias a `onEdit`),
  el guardado se rechaza y el panel muestra los valores actuales.

Activación:
1. Apps Script: pegar `Api.gs`, `Productos.gs` y `Code.gs`; en Propiedades del
   script crear `ADMIN_WRITE_TOKEN` (valor largo y aleatorio, distinto de
   `QUOTE_API_TOKEN`); publicar **nueva versión** de la implementación.
2. Servidor web: `GOOGLE_ADMIN_WRITE_TOKEN` con el mismo valor.


### Operaciones disponibles (v1.1.0)

| Pantalla | Qué hace | Acción de Apps Script | Permiso |
|---|---|---|---|
| Produtos (lista) | Precio y estado rápidos | `admin_actualizar_producto` | `catalog:write` |
| Produtos → Novo / Editar ficha | Todos los datos, imágenes por link de Drive | `admin_guardar_producto` | `catalog:write` |
| Produtos → Enviar imagens | Sube JPG/PNG/WEBP ≤ 3 MB a la carpeta pública y la asocia | `admin_subir_imagen` | `catalog:write` |
| Produtos → Custo interno | Costo, proveedor y margen | `admin_costos`, `admin_guardar_costo` | `costs:read` / `costs:write` |
| Categorias | Crear, renombrar (en cascada), ordenar, activar | `admin_guardar_categoria` | `catalog:write` |
| Clientes | Crear y editar sin duplicar correos | `admin_guardar_cliente` | `customers:write` |
| Orçamentos | Situación y notas internas | `admin_actualizar_cotizacion` | `quotations:write` |
| Equipe e permissões | Matriz de papéis (solo lectura) | — | — |

Todas usan el token de administración. Las respuestas de Apps Script en español se traducen al portugués en el panel. Detalles de activación y reglas: sección 11 de `integrations/google-apps-script/catalogo-lucas/INSTALACION.md`. Decisión de arquitectura: ADR 002 en `docs/architecture.md`.

**Prueba local sin la planilla real:**

```sh
node integrations/google-apps-script/catalogo-lucas/dev/servidor-simulado.mjs
CREER_ADMIN_PREVIEW=true GOOGLE_QUOTE_WEB_APP_URL=http://127.0.0.1:8787/exec \
  GOOGLE_QUOTE_API_TOKEN=read GOOGLE_ADMIN_WRITE_TOKEN=write npm run dev
```

Abrir `http://localhost:3000/admin/produtos` (con `localhost`, no `127.0.0.1`: el servidor de desarrollo bloquea sus recursos para otros orígenes).
