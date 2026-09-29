# Catálogo conectado · Capa 02

La web lee la pestaña PRODUCTOS de la hoja maestra de Gmusic mediante la
salida CSV de Google Sheets. La lectura ocurre en el servidor de Next.js y se
actualiza como máximo cada cinco minutos. El navegador recibe únicamente la
proyección pública: código, nombre, categoría, subcategoría, descripción,
precio, moneda, imágenes y estado.

CREER_CATALOG_MODE=presentation permite mostrar PENDIENTE y PUBLICADO durante
el laboratorio, con “Sob consulta” cuando el precio está vacío. Antes de abrir
el sitio definitivo debe usarse published; así la web solo muestra filas
completas que Lucas haya marcado como PUBLICADO.

Si Google Sheets no responde, la presentación conserva una copia segura de los
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
