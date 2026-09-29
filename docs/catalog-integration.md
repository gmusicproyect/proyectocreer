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
