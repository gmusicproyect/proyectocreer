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
personalización. Sin Supabase configurado, las solicitudes permanecen en el
navegador del laboratorio. Con Supabase configurado, /api/quotes registra la
solicitud en la base protegida por las políticas del proyecto.
