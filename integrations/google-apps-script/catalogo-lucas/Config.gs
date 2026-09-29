/**
 * =============================================================================
 * Config.gs — Configuración central del sistema "Catálogo Lucas"
 * -----------------------------------------------------------------------------
 * Contiene:
 *   1. Constantes (nombres de hojas, encabezados, estados, límites, expresiones)
 *   2. Acceso a la hoja CONFIGURACION (getConfig_ / setConfig_)
 *   3. Utilidades de infraestructura compartidas por todos los módulos
 *      (hojas, mapa de columnas, bloqueo, logs, normalización de datos)
 *
 * Regla de mantenimiento: si hay que cambiar un nombre de hoja, un límite
 * o una expresión de validación, se cambia SOLO aquí.
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// 1. CONSTANTES
// -----------------------------------------------------------------------------

const APP = Object.freeze({
  NOMBRE_MENU: 'CATÁLOGO LUCAS',
  VERSION: '1.0.0',
  MONEDA_DEFECTO: 'BRL'
});

const SHEETS = Object.freeze({
  PRODUCTOS: 'PRODUCTOS',
  CATEGORIAS: 'CATEGORIAS',
  IMPORTACIONES: 'IMPORTACIONES',
  CONFIGURACION: 'CONFIGURACION',
  LOGS: 'LOGS',
  VALIDACION: 'VALIDACION',
  CLIENTES: 'CLIENTES',
  COTIZACIONES: 'COTIZACIONES',
  COTIZACION_ITEMS: 'COTIZACION_ITEMS'
});

/** Encabezados de cada hoja. El sistema lee por NOMBRE de columna, no por posición. */
const HEADERS = Object.freeze({
  PRODUCTOS: [
    'ID', 'CODIGO', 'NOMBRE', 'CATEGORIA', 'SUBCATEGORIA', 'DESCRIPCION',
    'PRECIO', 'MONEDA', 'IMAGEN_PRINCIPAL', 'IMAGEN_2', 'IMAGEN_3',
    'DRIVE_FOLDER', 'ESTADO', 'DESTACADO', 'FECHA_CREACION',
    'FECHA_ACTUALIZACION', 'OBSERVACIONES'
  ],
  CATEGORIAS: ['ID', 'NOMBRE', 'SLUG', 'DESCRIPCION', 'ACTIVA', 'ORDEN'],
  IMPORTACIONES: [
    'FECHA', 'CARPETA_DRIVE', 'ARCHIVOS_ENCONTRADOS', 'PRODUCTOS_ASOCIADOS',
    'PRODUCTOS_NUEVOS', 'ERRORES', 'USUARIO'
  ],
  CONFIGURACION: ['CLAVE', 'VALOR'],
  LOGS: ['FECHA', 'ACCION', 'CODIGO', 'DETALLE', 'RESULTADO'],
  VALIDACION: ['TIPO', 'SEVERIDAD', 'CODIGO', 'FILA', 'DETALLE'],
  CLIENTES: [
    'ID', 'NOMBRE', 'EMPRESA', 'EMAIL', 'TELEFONO',
    'FECHA_CREACION', 'FECHA_ACTUALIZACION'
  ],
  COTIZACIONES: [
    'ID', 'REFERENCIA', 'CLIENTE_ID', 'ESTADO', 'NOTAS', 'FECHA_CREACION',
    'CLAVE_SOLICITUD', 'CONTACTO_NOMBRE', 'CONTACTO_EMPRESA', 'CONTACTO_EMAIL',
    'CONTACTO_TELEFONO'
  ],
  COTIZACION_ITEMS: [
    'COTIZACION_ID', 'CODIGO', 'NOMBRE', 'CANTIDAD', 'ACABAMENTO',
    'PERSONALIZACION', 'PRECIO_REFERENCIA', 'MONEDA'
  ]
});

/** Columnas sin las cuales no se puede registrar una cotización. */
const COTIZACIONES_REQUERIDAS = Object.freeze([
  'ID', 'REFERENCIA', 'CLIENTE_ID', 'ESTADO', 'NOTAS', 'FECHA_CREACION', 'CLAVE_SOLICITUD'
]);

const ESTADOS = Object.freeze(['BORRADOR', 'PUBLICADO', 'OCULTO', 'PENDIENTE']);

/** Columnas de imagen en orden: principal, secundaria 1 (_1), secundaria 2 (_2). */
const IMAGEN_SLOTS = Object.freeze(['IMAGEN_PRINCIPAL', 'IMAGEN_2', 'IMAGEN_3']);

const REGEX = Object.freeze({
  // Código: letras/números, @, guion o punto. Sin espacios ni "_" (el "_" separa el sufijo de imagen).
  CODIGO: /^[A-Z0-9][A-Z0-9.@\-]{1,39}$/,
  // Imágenes aceptadas (la extensión no distingue mayúsculas/minúsculas).
  IMAGEN: /^(.+)\.(jpe?g|png|webp)$/i,
  // Sufijo de imagen secundaria: _1, _2, ... (solo números).
  SUFIJO: /^\d{1,3}$/,
  ID_DRIVE: /^[a-zA-Z0-9_-]{15,}$/
});

const LIMITES = Object.freeze({
  TIEMPO_TOTAL_MS: 5 * 60 * 1000,    // Apps Script corta a los 6 min
  MARGEN_SEGURIDAD_MS: 20 * 1000,
  LOTE_PANEL_MS: 20 * 1000,          // cada llamada del panel trabaja ~20 s
  LOTE_PANEL_ARCHIVOS: 500,
  LOTE_MENU_MS: 90 * 1000,
  LOTE_MENU_ARCHIVOS: 3000,
  CONTEO_MS: 15 * 1000,              // tiempo máximo para contar archivos (barra de progreso)
  ESCANEO_VALIDACION_MS: 60 * 1000,
  MAX_ERRORES_MUESTRA: 25,
  LARGO: { NOMBRE: 150, CATEGORIA: 80, SUBCATEGORIA: 80, DESCRIPCION: 5000, OBSERVACIONES: 1000 },
  PRECIO_MAX: 100000000,
  CACHE_API_SEG: 300
});

const CLAVES_CONFIG = Object.freeze([
  'NOMBRE_NEGOCIO', 'MONEDA', 'DRIVE_PRINCIPAL_ID', 'ULTIMA_IMPORTACION', 'VERSION_SISTEMA'
]);

function valoresConfigPorDefecto_() {
  return {
    NOMBRE_NEGOCIO: 'Catálogo Lucas',
    MONEDA: APP.MONEDA_DEFECTO,
    DRIVE_PRINCIPAL_ID: '',
    ULTIMA_IMPORTACION: '',
    VERSION_SISTEMA: APP.VERSION
  };
}

// -----------------------------------------------------------------------------
// 2. HOJAS Y COLUMNAS
// -----------------------------------------------------------------------------

/** Devuelve la planilla. Funciona desde el menú, triggers y web app. */
function ss_() {
  const activa = SpreadsheetApp.getActiveSpreadsheet();
  if (activa) return activa;
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('No se encuentra la planilla. Abre la hoja y ejecuta "Sistema > Inicializar / reparar hojas".');
  return SpreadsheetApp.openById(id);
}

/** Devuelve una hoja o lanza un error con la solución. */
function hoja_(nombre) {
  const sh = ss_().getSheetByName(nombre);
  if (!sh) {
    throw new Error('Falta la hoja "' + nombre + '". Ejecuta ' + APP.NOMBRE_MENU +
      ' > Sistema > Inicializar / reparar hojas.');
  }
  return sh;
}

/**
 * Lee la fila 1 y devuelve { NOMBRE_COLUMNA: índice_base_0 }.
 * Lanza error si falta alguna columna requerida.
 */
function mapaColumnas_(sh, requeridas) {
  const ultimaCol = sh.getLastColumn();
  const encabezados = ultimaCol ? sh.getRange(1, 1, 1, ultimaCol).getValues()[0] : [];
  const mapa = {};
  encabezados.forEach(function (h, i) {
    const clave = String(h).trim().toUpperCase();
    if (clave && mapa[clave] === undefined) mapa[clave] = i;
  });
  const faltan = (requeridas || []).filter(function (h) { return mapa[h] === undefined; });
  if (faltan.length) {
    throw new Error('En la hoja "' + sh.getName() + '" faltan las columnas: ' + faltan.join(', ') +
      '. Ejecuta Sistema > Inicializar / reparar hojas.');
  }
  return mapa;
}

/** Garantiza que la hoja tenga al menos `filas` filas en total. */
function asegurarFilas_(sh, filas) {
  const max = sh.getMaxRows();
  if (filas > max) sh.insertRowsAfter(max, filas - max);
}

/** Garantiza que la hoja tenga al menos `columnas` columnas en total. */
function asegurarColumnas_(sh, columnas) {
  const max = sh.getMaxColumns();
  if (columnas > max) sh.insertColumnsAfter(max, columnas - max);
}

/** Convierte índice de columna base 1 en letra (1 -> A, 27 -> AA). */
function letraColumna_(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// -----------------------------------------------------------------------------
// 3. CONFIGURACION (hoja CLAVE | VALOR)
// -----------------------------------------------------------------------------

let __configCache = null;

function leerConfig_() {
  if (__configCache) return __configCache;
  const sh = hoja_(SHEETS.CONFIGURACION);
  const n = sh.getLastRow() - 1;
  const cfg = {};
  if (n > 0) {
    sh.getRange(2, 1, n, 2).getValues().forEach(function (fila) {
      const clave = String(fila[0]).trim().toUpperCase();
      if (clave) cfg[clave] = fila[1];
    });
  }
  __configCache = cfg;
  return cfg;
}

function getConfig_(clave) {
  const v = leerConfig_()[String(clave).toUpperCase()];
  return v === undefined || v === null ? '' : String(v).trim();
}

function setConfig_(clave, valor) {
  const sh = hoja_(SHEETS.CONFIGURACION);
  const buscada = String(clave).trim().toUpperCase();
  const n = sh.getLastRow() - 1;
  if (n > 0) {
    const claves = sh.getRange(2, 1, n, 1).getValues();
    for (let i = 0; i < claves.length; i++) {
      if (String(claves[i][0]).trim().toUpperCase() === buscada) {
        sh.getRange(i + 2, 2).setValue(valor);
        __configCache = null;
        return;
      }
    }
  }
  sh.appendRow([buscada, valor]);
  __configCache = null;
}

// -----------------------------------------------------------------------------
// 4. BLOQUEO, LOGS Y USUARIO
// -----------------------------------------------------------------------------

/**
 * Ejecuta fn con el bloqueo del script para que dos procesos
 * (panel, menú, trigger) no escriban a la vez en PRODUCTOS.
 */
function conLock_(fn, esperaMs) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(esperaMs || 30000)) {
    throw new Error('El sistema está ocupado (hay otra importación o edición en curso). Intenta de nuevo en unos segundos.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/** Registra varias filas en LOGS en una sola escritura. filas = [[accion, codigo, detalle, resultado], ...] */
function registrarLogs_(filas) {
  if (!filas || !filas.length) return;
  const sh = ss_().getSheetByName(SHEETS.LOGS);
  if (!sh) return; // el log nunca debe romper una operación
  const ahora = new Date();
  const datos = filas.map(function (f) {
    return [ahora, celdaSegura_(f[0]), celdaSegura_(f[1] || ''), celdaSegura_(String(f[2] || '').slice(0, 45000)), celdaSegura_(f[3] || 'OK')];
  });
  const inicio = sh.getLastRow() + 1;
  asegurarFilas_(sh, inicio + datos.length - 1);
  sh.getRange(inicio, 1, datos.length, 5).setValues(datos);
}

function registrarLog_(accion, codigo, detalle, resultado) {
  registrarLogs_([[accion, codigo, detalle, resultado]]);
}

function usuarioActual_() {
  try {
    return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || 'desconocido';
  } catch (e) {
    return 'desconocido';
  }
}

// -----------------------------------------------------------------------------
// 5. NORMALIZACIÓN Y SANEAMIENTO
// -----------------------------------------------------------------------------

function texto_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function normalizarCodigo_(v) {
  return texto_(v).toUpperCase();
}

function esCodigoValido_(codigo) {
  return REGEX.CODIGO.test(codigo);
}

function quitarAcentos_(s) {
  return texto_(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Texto en minúsculas sin acentos, para comparar y buscar. */
function claveBusqueda_(s) {
  return quitarAcentos_(s).toLowerCase();
}

function slugify_(s) {
  return claveBusqueda_(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function aBooleano_(v) {
  if (v === true) return true;
  if (v === false || v === null || v === undefined) return false;
  return ['TRUE', 'SI', 'SÍ', '1', 'X', 'VERDADERO', 'YES'].indexOf(String(v).trim().toUpperCase()) !== -1;
}

/**
 * Convierte precios escritos como número o texto ("1.234,56", "1234.56", "R$ 45")
 * Devuelve { valor: número|null, valido: boolean }. Vacío = { null, true }.
 */
function leerPrecio_(v) {
  if (v === '' || v === null || v === undefined) return { valor: null, valido: true };
  if (typeof v === 'number') return { valor: v, valido: isFinite(v) && v >= 0 };
  const original = String(v).trim();
  if (/^[=+\-@]/.test(original)) return { valor: null, valido: false };
  let s = original.replace(/[^\d.,-]/g, '');
  if (!s) return { valor: null, valido: false };
  const ultimaComa = s.lastIndexOf(','), ultimoPunto = s.lastIndexOf('.');
  if (ultimaComa > ultimoPunto) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return { valor: isFinite(n) ? n : null, valido: isFinite(n) && n >= 0 };
}

/**
 * Evita inyección de fórmulas: un texto que empieza con = + - @ se guarda
 * con apóstrofo delante (Sheets lo oculta y lo trata como texto).
 * También elimina caracteres de control invisibles.
 */
function celdaSegura_(v) {
  if (typeof v !== 'string') return v;
  const limpio = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  return /^[=+\-@]/.test(limpio) ? "'" + limpio : limpio;
}

function fechaIso_(v) {
  return v instanceof Date && !isNaN(v.getTime()) ? v.toISOString() : '';
}

function fechaTexto_(v) {
  if (!(v instanceof Date) || isNaN(v.getTime())) return texto_(v);
  return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function escaparHtml_(s) {
  return texto_(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/** Extrae el ID de una carpeta desde un link de Drive o un ID pelado. */
function extraerIdCarpeta_(entrada) {
  const s = texto_(entrada);
  if (!s) return '';
  const m = s.match(/\/folders\/([a-zA-Z0-9_-]{10,})/) || s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  return REGEX.ID_DRIVE.test(s) ? s : '';
}

/** Extrae el ID de un archivo desde un link de Drive o un ID pelado. */
function extraerIdArchivo_(entrada) {
  const s = texto_(entrada);
  if (!s) return '';
  const m = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  return REGEX.ID_DRIVE.test(s) ? s : '';
}
