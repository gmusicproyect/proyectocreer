# Catálogo Lucas — Arquitectura, instalación y uso

Sistema de administración de productos en **Google Sheets + Apps Script**: base maestra, importación automática de imágenes desde Drive, panel administrador y datos listos para un catálogo web.

---

## 1. Arquitectura

```
GOOGLE DRIVE  ──  carpeta principal (+ subcarpetas) con imágenes nombradas por código
     │              XBZ-1024.jpg · XBZ-1024_1.jpg · XBZ-1024_2.jpg
     ▼
DriveImporter.gs ── lee archivos por LOTES, extrae el código, crea PENDIENTES,
     │              asocia imágenes, nunca duplica ni sobrescribe, guarda su avance
     ▼
GOOGLE SHEETS  ──  PRODUCTOS · CATEGORIAS · IMPORTACIONES · CONFIGURACION · LOGS · VALIDACION
     │
     ├── Productos.gs / Validaciones.gs ── reglas de negocio y auditoría
     ├── Code.gs + Panel.html ─────────── menú "CATÁLOGO LUCAS" y panel administrador
     ├── Api.gs ──────────────────────── doGet() → catálogo público / doPost() → cotizaciones
     └── Cotizaciones.gs ─────────────── clientes, cotizaciones e ítems
```

| Archivo | Responsabilidad |
|---|---|
| `Config.gs` | Constantes (hojas, columnas, estados, límites), lectura/escritura de CONFIGURACION, utilidades compartidas (bloqueo, logs, saneamiento de datos). |
| `Code.gs` | Menú, inicialización de hojas, apertura del panel, acciones del menú, triggers y las funciones que llama el panel. |
| `Productos.gs` | Leer, validar, crear, editar, publicar/ocultar y eliminar productos. Categorías. Estadísticas. |
| `DriveImporter.gs` | `importarProductosDesdeDrive(folderId)`, procesamiento por lotes con reanudación, `sincronizacionDiaria()`. |
| `Validaciones.gs` | `validarBase()` y `generarResumen()`. |
| `Api.gs` | `getProductosPublicados()`, `getProductosPorCategoria()`, `doGet()` y la estructura de `generarDescripcionIA()`. |
| `Cotizaciones.gs` | Valida la solicitud web, actualiza o crea el cliente y registra la cotización con sus productos. |
| `Panel.html` · `Styles.html` · `Scripts.html` | Panel administrador (estructura, estilos, lógica). |

**Decisiones de diseño importantes**

- **Lectura por nombre de columna.** El sistema busca cada columna por su encabezado, no por su posición. Puedes reordenar columnas o agregar columnas propias sin romper nada. Lo que no puedes hacer es **renombrar** los encabezados.
- **Importación reanudable.** Google corta cualquier script a los 6 minutos. La importación trabaja por lotes y guarda en qué carpeta y en qué archivo quedó. Si se corta, la siguiente ejecución continúa desde ahí.
- **Tres garantías anti-duplicado:**
  1. Un producto se busca por `CODIGO` antes de crearlo.
  2. Cada imagen se identifica por el ID del archivo en Drive, así que la misma imagen nunca se importa dos veces.
  3. Si el espacio de imagen ya tiene otro archivo, se reporta como **conflicto** y no se reemplaza.
- **Bloqueo.** Todas las escrituras pasan por un bloqueo del script, así que el panel, el menú y el trigger nunca escriben al mismo tiempo.
- **Nada se borra automáticamente.** Borrar un producto solo es posible desde el panel, escribiendo el código para confirmar. Antes de borrar se guarda una copia de la fila en LOGS.

---

## 2. Instalación

1. Crea una **hoja de cálculo nueva** en Google Sheets, por ejemplo "Catálogo Lucas — Base maestra".
   > ⚠️ No la instales en la misma hoja del generador de PDF anterior: ambos proyectos definen `onOpen()` y chocarían.
2. En esa hoja ve a **Extensiones → Apps Script**.
3. En el editor:
   - Renombra `Código.gs` a `Code.gs` y reemplaza su contenido por el de `Code.gs`.
   - Crea los archivos de script con **+ → Script**: `Config`, `Productos`, `DriveImporter`, `Validaciones`, `Api`, `Cotizaciones`. Apps Script agrega `.gs` solo.
   - Crea los archivos HTML con **+ → HTML**: `Panel`, `Styles`, `Scripts`. Apps Script agrega `.html` solo.
   - Pega en cada archivo el contenido correspondiente, **completo**.
4. En **⚙️ Configuración del proyecto**:
   - Verifica que esté marcado **"Habilitar el entorno de ejecución de Chrome V8"**.
   - Ajusta la **zona horaria** (por ejemplo `America/Sao_Paulo`).
5. Guarda con 💾 y vuelve a la hoja. **Recarga la página (F5)**. Aparecerá el menú **CATÁLOGO LUCAS**.

---

## 3. Crear las hojas

Ve a **CATÁLOGO LUCAS → ⚙️ Sistema → Inicializar / reparar hojas**. Esto:

- crea `PRODUCTOS`, `CATEGORIAS`, `IMPORTACIONES`, `CONFIGURACION`, `LOGS`, `VALIDACION`, `CLIENTES`, `COTIZACIONES` y `COTIZACION_ITEMS` con sus encabezados;
- carga los valores por defecto en CONFIGURACION (`MONEDA = BRL`, `VERSION_SISTEMA`, etc.);
- agrega la lista desplegable de ESTADO, la casilla DESTACADO, la lista de CATEGORIA y los formatos de precio y fecha;
- marca **en rojo** los códigos duplicados;
- borra la "Hoja 1" vacía.

Puedes ejecutarlo tantas veces como quieras. Si falta alguna columna, la agrega al final sin tocar tus datos.

Después, en **CATEGORIAS**, crea tus categorías (NOMBRE, ACTIVA ✔, ORDEN). También puedes crearlas desde el panel con el botón **+** junto al campo Categoría.

---

## 4. Configurar Drive

1. Crea una carpeta principal, por ejemplo "Fotos XBZ". Puede tener subcarpetas: el sistema las recorre todas.
2. Nombra cada imagen con el código del producto:

| Archivo | Resultado |
|---|---|
| `XBZ-1024.jpg` | Imagen principal → `IMAGEN_PRINCIPAL` |
| `XBZ-1024_1.jpg` | Secundaria 1 → `IMAGEN_2` |
| `XBZ-1024_2.png` | Secundaria 2 → `IMAGEN_3` |
| `XBZ-1024_3.jpg` | Se reporta: solo hay 3 columnas de imagen |
| `notas.txt` | Se ignora |
| `XBZ 1024.jpg` | Error: el código tiene un espacio |
| `P@14962.jpg` | Código válido que conserva el `@` |

   Formatos válidos: jpg, jpeg, png y webp, sin importar mayúsculas en la extensión. Los códigos se guardan siempre en mayúsculas.
3. Copia el ID de la carpeta, que es lo que aparece después de `/folders/` en la URL, y pégalo en **CONFIGURACION → DRIVE_PRINCIPAL_ID**. Si lo dejas vacío, se guarda solo la primera vez que importes.
4. **Para el catálogo web público:** comparte la carpeta como **"Cualquier persona con el enlace — Lector"**. Sin eso, las imágenes no se ven fuera de tu cuenta. Tampoco se verán las miniaturas del panel si tu navegador bloquea cookies de terceros.

---

## 5. Autorizar permisos

La primera vez que uses cualquier opción del menú, Google pedirá autorización:

1. Haz clic en **Continuar** y elige tu cuenta.
2. Aparecerá **"Google no ha verificado esta app"**. Es normal, porque el script es tuyo.
3. Haz clic en **Configuración avanzada → Ir a (nombre del proyecto) (no seguro) → Permitir**.

Los permisos que pide son: ver y editar esta hoja, leer tus archivos de Drive, crear triggers y conectarse a servicios externos. Este último solo lo usará la IA en el futuro.

---

## 6. Probar la importación

Haz una prueba pequeña antes de cargar miles de archivos:

1. Crea una carpeta "Prueba" con estos archivos: `TEST-1.jpg`, `TEST-1_1.jpg`, `TEST-2.png`, `notas.txt` y `TEST 3.jpg` (este último con espacio, a propósito).
2. **CATÁLOGO LUCAS → Abrir panel → Importar Drive**, pega el link de la carpeta y pulsa **IMPORTAR PRODUCTOS**.
3. El resultado esperado es:

| Indicador | Esperado |
|---|---|
| Archivos procesados | 5 |
| Productos nuevos | 2 (TEST-1 y TEST-2, en estado PENDIENTE) |
| Imágenes asociadas | 3 |
| Errores | 1 (`TEST 3.jpg`) |
| Archivos ignorados | 1 (`notas.txt`) |

4. Revisa **PRODUCTOS**: `TEST-1` debe tener `IMAGEN_PRINCIPAL` e `IMAGEN_2`. Revisa también **IMPORTACIONES** y **LOGS**.

Con miles de archivos puedes usar el panel o el menú **Importar desde Drive**. Si aparece "⏳ en pausa", vuelve a ejecutar con la misma carpeta y continuará donde quedó. Para dejarlo automático, usa **Sistema → Activar sincronización diaria** (03:00 aprox.). Si no termina, se reprograma sola cada minuto hasta completar.

---

## 7. Verificar que no existan duplicados

1. **Reimporta la misma carpeta.** Debe dar `Productos nuevos: 0`, `Imágenes asociadas: 0` y `Ya importadas: N` (todas).
2. **CATÁLOGO LUCAS → Validar base.** Revisa en la hoja VALIDACION que no aparezcan `CODIGO_DUPLICADO`, `ID_DUPLICADO` ni `IMAGEN_REPETIDA`.
3. **Revisión visual.** Los códigos repetidos se pintan de rojo en la columna CODIGO.
4. **Fórmula de control** en una celda libre: `=ROWS(FILTER(PRODUCTOS!B2:B, PRODUCTOS!B2:B<>"")) - COUNTUNIQUE(PRODUCTOS!B2:B)`. Debe dar **0**.

Si alguien escribe un duplicado a mano en la hoja, el sistema no lo borra: lo reporta en la validación para que tú decidas cuál conservar.

---

## 8. Uso diario

- **Dashboard:** muestra los totales. Al hacer clic en una tarjeta se filtra la tabla.
- **Productos:** busca por código o nombre, filtra por categoría, estado o "solo incompletos", y permite **Publicar/Ocultar** con un clic.
- **Publicar exige:** nombre, categoría, precio, descripción e imagen principal. Mientras falte algo, guarda el producto como BORRADOR.
- **PENDIENTE** significa "creado por la importación, falta completarlo".
- **Eliminar** está solo en el formulario del producto y pide escribir el código. Para sacar un producto del catálogo, lo normal es ponerlo **OCULTO**.

---

## 9. Catálogo web y recepción de cotizaciones

- **Desde el propio script:** `getProductosPublicados()` y `getProductosPorCategoria('bebidas')`.
- **Desde fuera, como Web App:** ve a **Implementar → Nueva implementación → Aplicación web**, con "Ejecutar como: Yo" y "Acceso: Cualquier persona". La URL `/exec` devuelve JSON, y `/exec?categoria=bebidas` lo filtra por categoría.
- **Campos que salen:** código, nombre, categoría, subcategoría, descripción, precio, moneda, imagenPrincipal, imagenes y destacado. **Nunca salen** el ID interno, la carpeta, las observaciones ni productos que no estén PUBLICADOS.
- Las respuestas se guardan en caché 5 minutos y cualquier edición la invalida al instante.
- **`PRECIO` es el precio de venta público.** No guardes ahí el costo del proveedor.

Para recibir cotizaciones desde la web:

1. En **Configuración del proyecto → Propiedades del script**, agrega `QUOTE_API_TOKEN` con un valor secreto largo y aleatorio.
2. Ve a **Implementar → Nueva implementación → Aplicación web**.
3. Selecciona **Ejecutar como: Yo** y **Acceso: Cualquier persona**. Copia la URL terminada en `/exec`.
4. En el servidor de la web configura `GOOGLE_QUOTE_WEB_APP_URL` con esa URL y `GOOGLE_QUOTE_API_TOKEN` con exactamente el mismo secreto.
5. Envía una cotización de prueba. Debe crear o actualizar una fila en `CLIENTES`, crear una fila con estado `NUEVA` en `COTIZACIONES` y una fila por producto en `COTIZACION_ITEMS`.

El token solo viaja entre el servidor de la web y Apps Script; no se expone al navegador. Cambiar el código después de la primera publicación exige crear una versión nueva y actualizar la implementación activa.

**IA (preparada, no conectada):** `generarDescripcionIA('XBZ-1024')` devuelve el prompt y los datos de entrada. `validarRespuestaIA_()` rechaza cualquier respuesta con números que no estén en los datos originales, por ejemplo "24 horas" si ese dato no existe. Para conectar Gemini hay que implementar `llamarGemini_()` y poner `IA_CONFIG.HABILITADA = true`.

---

## 10. Errores comunes

| Mensaje / síntoma | Causa | Solución |
|---|---|---|
| No aparece el menú CATÁLOGO LUCAS | La hoja no se recargó o hay un error de sintaxis al pegar | Recarga con F5. En Apps Script, ejecuta `onOpen` y mira el error. |
| "Falta la hoja PRODUCTOS…" | No se inicializó el sistema | Ejecuta **Sistema → Inicializar / reparar hojas**. |
| "En la hoja PRODUCTOS faltan las columnas…" | Se renombró o borró un encabezado | Ejecuta Inicializar (agrega las que falten) y corrige el nombre original. |
| "No se encontró la carpeta o no tienes acceso" | El link es de un archivo y no de una carpeta, o la carpeta no está compartida contigo | Usa el link de la **carpeta** (`/folders/…`). |
| "⏳ Importación en pausa" | Normal con muchos archivos | Vuelve a ejecutar con la misma carpeta; continúa sola. |
| Conflictos en la importación | Dos archivos distintos con el mismo nombre de código | Decide cuál es el correcto, borra el otro de la columna de imagen y reimporta. |
| "Imagen … no hay columna para _3" | Solo existen 3 columnas de imagen | Renombra el archivo o agrega columnas en una versión futura. |
| "Para PUBLICAR falta: …" | Faltan nombre, categoría, precio o imagen principal | Completa esos datos o guárdalo como BORRADOR. |
| "La categoría X no existe" | Categoría escrita a mano que no está en CATEGORIAS | Créala en CATEGORIAS o con el botón **+** del panel. |
| Miniaturas "sin vista" en el panel | El navegador bloquea cookies de terceros o la imagen no está compartida | Comparte la carpeta con el enlace, o permite cookies para `drive.google.com`. |
| "El sistema está ocupado…" | Hay otra importación o edición en curso | Espera unos segundos y reintenta. |
| La importación quedó "trabada" | Se cerró el panel en medio de un lote | Menú **Sistema → Cancelar importación en curso**, o vuelve a importar la misma carpeta para continuar. |
| Código numérico pierde ceros (`00123` → `123`) | Sheets lo convirtió en número al escribirlo a mano | La columna CODIGO queda en formato texto tras Inicializar. Escribe de nuevo el código. |
| "Se ha excedido el tiempo máximo de ejecución" | Validación con una carpeta enorme | La validación revisa Drive como máximo 60 s y marca `ESCANEO_PARCIAL`. Los datos de la hoja sí se revisan completos. |
