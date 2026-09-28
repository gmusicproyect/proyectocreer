/**
 * =============================================================================
 * DriveImporter.gs — Importación de imágenes desde Google Drive
 * -----------------------------------------------------------------------------
 * Reglas de nombres:
 *   XBZ-1024.jpg      -> imagen principal de XBZ-1024   (columna IMAGEN_PRINCIPAL)
 *   XBZ-1024_1.jpg    -> secundaria 1                   (columna IMAGEN_2)
 *   XBZ-1024_2.jpg    -> secundaria 2                   (columna IMAGEN_3)
 *   XBZ-1024_3.jpg... -> se reporta: no hay más columnas de imagen
 *   Extensiones: jpg, jpeg, png, webp (sin importar mayúsculas).
 *   El código es lo que está antes del primer "_".
 *
 * Garantías:
 *   - Un producto nunca se duplica (se busca por CODIGO).
 *   - Una imagen nunca se importa dos veces (se compara el ID del archivo de Drive).
 *   - Nunca se sobrescribe una imagen ya asignada: si el espacio está ocupado por
 *     otro archivo, se reporta como CONFLICTO y no se toca.
 *   - Nunca se borra nada.
 *
 * Escala (cientos o miles de archivos):
 *   Apps Script corta a los 6 minutos. La importación trabaja por LOTES y guarda
 *   su avance (carpeta actual + token de continuación de Drive) en las
 *   propiedades del script. Si se corta, la siguiente ejecución CONTINÚA donde
 *   quedó en lugar de empezar de cero. Incluye subcarpetas.
 * =============================================================================
 */

const ESTADO_IMPORT = Object.freeze({
  PREFIJO: 'IMPORT_ESTADO_',
  PARTES: 'IMPORT_ESTADO_PARTES',
  TAM_PARTE: 8000
});

// Marcas por código dentro de estado.codigos
const MARCA = Object.freeze({ ENCONTRADO: 1, ASOCIADO: 2, NUEVO: 4 });

// -----------------------------------------------------------------------------
// 1. FUNCIÓN PRINCIPAL
// -----------------------------------------------------------------------------

/**
 * Importa (o continúa importando) las imágenes de una carpeta de Drive.
 * @param {string} folderId  ID o link de la carpeta. Si viene vacío usa DRIVE_PRINCIPAL_ID.
 * @param {Object=} opciones { origen: 'menu'|'trigger'|'manual', presupuestoMs: número }
 * @return {Object} resumen (ver construirResumen_). resumen.terminado=false si quedó pendiente.
 */
function importarProductosDesdeDrive(folderId, opciones) {
  opciones = opciones || {};
  const origen = opciones.origen || 'manual';
  const rootId = extraerIdCarpeta_(folderId || getConfig_('DRIVE_PRINCIPAL_ID'));
  if (!rootId) throw new Error('Indica un link o ID de carpeta de Drive válido.');
  verificarCarpeta_(rootId);

  const t0 = Date.now();
  const limite = opciones.presupuestoMs || LIMITES.TIEMPO_TOTAL_MS;

  // Preparar estado: continuar si hay una importación pendiente de la misma carpeta.
  conLock_(function () {
    const previo = cargarEstado_();
    if (previo && previo.raiz === rootId && !previo.terminado) return;
    if (previo && !previo.terminado) {
      registrarLog_('IMPORTACION_DESCARTADA', '', 'Se reemplazó una importación sin terminar de la carpeta ' + previo.raizNombre, 'ADVERTENCIA');
    }
    guardarEstado_(nuevoEstado_(rootId, origen));
  });

  let resumen = null;
  while (true) {
    const restante = limite - (Date.now() - t0) - LIMITES.MARGEN_SEGURIDAD_MS;
    if (restante <= 5000) break;
    const r = conLock_(function () {
      const e = cargarEstado_();
      if (!e) return { terminado: true, resumen: null }; // otro proceso la terminó
      procesarLote_(e, Math.min(restante, LIMITES.LOTE_MENU_MS), LIMITES.LOTE_MENU_ARCHIVOS);
      if (e.terminado) return { terminado: true, resumen: finalizarImportacion_(e) };
      guardarEstado_(e);
      return { terminado: false, resumen: construirResumen_(e) };
    }, 60000);
    resumen = r.resumen;
    if (r.terminado) break;
  }
  return resumen || { terminado: true, mensaje: 'La importación fue completada por otro proceso.' };
}

// -----------------------------------------------------------------------------
// 2. ESTADO DE LA IMPORTACIÓN (persistido en propiedades del script)
// -----------------------------------------------------------------------------

function nuevoEstado_(rootId, origen) {
  const carpeta = DriveApp.getFolderById(rootId);
  return {
    v: 1,
    raiz: rootId,
    raizNombre: carpeta.getName(),
    pendientes: [rootId],   // carpetas por recorrer
    actual: null,           // { id, token } carpeta en curso
    carpetas: 0,
    total: null,            // total de archivos (solo si se contó para la barra)
    stats: {
      procesados: 0, encontrados: 0, nuevos: 0, asociadas: 0, productosAsociados: 0,
      errores: 0, ignorados: 0, yaImportadas: 0, conflictos: 0
    },
    codigos: {},            // codigo -> marcas (MARCA)
    muestra: [],            // primeros errores/avisos para mostrar
    inicio: new Date().toISOString(),
    origen: origen,
    terminado: false
  };
}

/**
 * Guarda el estado en varias propiedades (cada una admite ~9 KB).
 * Se escapan los caracteres no ASCII para que cada parte ocupe lo que mide.
 */
function guardarEstado_(estado) {
  const props = PropertiesService.getScriptProperties();
  const json = JSON.stringify(estado).replace(/[\u0080-￿]/g, function (c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
  const partes = Math.max(1, Math.ceil(json.length / ESTADO_IMPORT.TAM_PARTE));
  const anteriores = Number(props.getProperty(ESTADO_IMPORT.PARTES) || 0);
  const obj = {};
  for (let i = 0; i < partes; i++) {
    obj[ESTADO_IMPORT.PREFIJO + i] = json.substr(i * ESTADO_IMPORT.TAM_PARTE, ESTADO_IMPORT.TAM_PARTE);
  }
  obj[ESTADO_IMPORT.PARTES] = String(partes);
  props.setProperties(obj);
  for (let j = partes; j < anteriores; j++) props.deleteProperty(ESTADO_IMPORT.PREFIJO + j);
}

function cargarEstado_() {
  const props = PropertiesService.getScriptProperties();
  const partes = Number(props.getProperty(ESTADO_IMPORT.PARTES) || 0);
  if (!partes) return null;
  let json = '';
  for (let i = 0; i < partes; i++) json += props.getProperty(ESTADO_IMPORT.PREFIJO + i) || '';
  try {
    return JSON.parse(json);
  } catch (e) {
    borrarEstado_();
    registrarLog_('IMPORTACION_ESTADO', '', 'Estado de importación dañado; se descartó.', 'ERROR');
    return null;
  }
}

function borrarEstado_() {
  const props = PropertiesService.getScriptProperties();
  const partes = Number(props.getProperty(ESTADO_IMPORT.PARTES) || 0);
  for (let i = 0; i < partes; i++) props.deleteProperty(ESTADO_IMPORT.PREFIJO + i);
  props.deleteProperty(ESTADO_IMPORT.PARTES);
}

// -----------------------------------------------------------------------------
// 3. PROCESAMIENTO POR LOTES
// -----------------------------------------------------------------------------

/**
 * Procesa archivos hasta agotar el tiempo o la cantidad máxima.
 * Debe llamarse DENTRO de conLock_. Modifica `estado` y escribe en PRODUCTOS.
 */
function procesarLote_(estado, presupuestoMs, maxArchivos) {
  const t0 = Date.now();
  const tabla = cargarTablaProductos_();
  const ctx = {
    tabla: tabla,
    idsImagen: indiceImagenes_(tabla),
    siguienteId: siguienteId_(tabla.filas, tabla.map),
    moneda: getConfig_('MONEDA') || APP.MONEDA_DEFECTO,
    tocadas: new Set(),   // índices de filas existentes modificadas
    logs: []
  };
  let enLote = 0;
  const hayTiempo = function () { return Date.now() - t0 < presupuestoMs && enLote < maxArchivos; };

  while (hayTiempo()) {
    if (!estado.actual) {
      if (!estado.pendientes.length) { estado.terminado = true; break; }
      const id = estado.pendientes.shift();
      estado.actual = { id: id, token: null };
      estado.carpetas++;
      try {
        const subcarpetas = DriveApp.getFolderById(id).getFolders();
        while (subcarpetas.hasNext()) estado.pendientes.push(subcarpetas.next().getId());
      } catch (e) {
        anotarError_(estado, ctx, '', 'No se pudo abrir una subcarpeta: ' + e.message);
        estado.actual = null;
        continue;
      }
    }

    const it = estado.actual.token
      ? DriveApp.continueFileIterator(estado.actual.token)
      : DriveApp.getFolderById(estado.actual.id).getFiles();

    let carpetaAgotada = true;
    while (it.hasNext()) {
      if (!hayTiempo()) {
        estado.actual.token = it.getContinuationToken();
        carpetaAgotada = false;
        break;
      }
      procesarArchivo_(it.next(), estado.actual.id, estado, ctx);
      enLote++;
    }
    if (carpetaAgotada) estado.actual = null;
  }
  if (!estado.actual && !estado.pendientes.length) estado.terminado = true;

  guardarCambiosImportacion_(ctx);
  registrarLogs_(ctx.logs);
  return enLote;
}

/** { idArchivo: true } con todas las imágenes ya asignadas en PRODUCTOS. */
function indiceImagenes_(tabla) {
  const ids = new Set();
  tabla.filas.forEach(function (f) {
    IMAGEN_SLOTS.forEach(function (s) {
      const id = texto_(f[tabla.map[s]]);
      if (id) ids.add(id);
    });
  });
  return ids;
}

/**
 * Interpreta el nombre de un archivo.
 * Devuelve { tipo: 'principal'|'secundaria'|'ignorado'|'error', codigo, orden, motivo }.
 */
function parsearNombreArchivo_(nombre) {
  const m = texto_(nombre).match(REGEX.IMAGEN);
  if (!m) return { tipo: 'ignorado', motivo: 'no es jpg, jpeg, png ni webp' };
  const base = m[1].trim();
  const corte = base.indexOf('_');
  const codigo = normalizarCodigo_(corte === -1 ? base : base.slice(0, corte));
  if (!esCodigoValido_(codigo)) return { tipo: 'error', codigo: codigo, motivo: 'código "' + codigo + '" no válido en el nombre' };
  if (corte === -1) return { tipo: 'principal', codigo: codigo, orden: 0 };
  const sufijo = base.slice(corte + 1).trim();
  if (!REGEX.SUFIJO.test(sufijo) || Number(sufijo) < 1) {
    return { tipo: 'error', codigo: codigo, motivo: 'sufijo "_' + sufijo + '" no válido (usa _1, _2, ...)' };
  }
  return { tipo: 'secundaria', codigo: codigo, orden: Number(sufijo) };
}

/** Procesa un archivo de Drive: crea producto si hace falta y asocia la imagen. */
function procesarArchivo_(archivo, carpetaId, estado, ctx) {
  const st = estado.stats;
  const t = ctx.tabla, map = t.map;
  st.procesados++;

  const nombre = archivo.getName();
  if (archivo.isTrashed()) { st.ignorados++; return; }

  const info = parsearNombreArchivo_(nombre);
  if (info.tipo === 'ignorado') { st.ignorados++; return; }
  if (info.tipo === 'error') { anotarError_(estado, ctx, info.codigo, nombre + ': ' + info.motivo); return; }
  if (!/^image\//.test(archivo.getMimeType())) {
    anotarError_(estado, ctx, info.codigo, nombre + ': tiene extensión de imagen pero Drive no lo reconoce como imagen');
    return;
  }

  const fileId = archivo.getId();
  const codigo = info.codigo;
  const marcas = estado.codigos[codigo] || 0;

  // Buscar o crear el producto.
  let idx = t.porCodigo.get(codigo);
  if (idx === undefined) {
    idx = crearFilaPendiente_(ctx, codigo, carpetaId);
    estado.codigos[codigo] = marcas | MARCA.NUEVO;
    st.nuevos++;
    ctx.logs.push(['PRODUCTO_NUEVO', codigo, 'Creado como PENDIENTE desde ' + nombre, 'OK']);
  } else if (!(marcas & MARCA.NUEVO) && !(marcas & MARCA.ENCONTRADO)) {
    estado.codigos[codigo] = marcas | MARCA.ENCONTRADO;
    st.encontrados++;
  }

  // Imagen ya importada (mismo archivo de Drive): no se duplica.
  if (ctx.idsImagen.has(fileId)) { st.yaImportadas++; return; }

  const slot = info.tipo === 'principal' ? 'IMAGEN_PRINCIPAL'
    : info.orden === 1 ? 'IMAGEN_2'
    : info.orden === 2 ? 'IMAGEN_3'
    : null;
  if (!slot) {
    st.ignorados++;
    anotarMuestra_(estado, nombre + ': no hay columna para la imagen _' + info.orden + ' (máximo _2)');
    ctx.logs.push(['IMAGEN_SIN_ESPACIO', codigo, nombre, 'ADVERTENCIA']);
    return;
  }

  const fila = t.filas[idx];
  const actual = texto_(fila[map[slot]]);
  if (actual && actual !== fileId) {
    st.conflictos++;
    anotarMuestra_(estado, nombre + ': ' + slot + ' de ' + codigo + ' ya tiene otra imagen (no se reemplazó)');
    ctx.logs.push(['IMAGEN_CONFLICTO', codigo, nombre + ' -> ' + slot + ' ocupado', 'ADVERTENCIA']);
    return;
  }

  fila[map[slot]] = fileId;
  if (!texto_(fila[map.DRIVE_FOLDER])) fila[map.DRIVE_FOLDER] = carpetaId;
  fila[map.FECHA_ACTUALIZACION] = new Date();
  if (idx < t.nOriginal) ctx.tocadas.add(idx);
  ctx.idsImagen.add(fileId);
  st.asociadas++;
  if (!((estado.codigos[codigo] || 0) & MARCA.ASOCIADO)) {
    estado.codigos[codigo] = (estado.codigos[codigo] || 0) | MARCA.ASOCIADO;
    st.productosAsociados++;
  }
  ctx.logs.push(['IMAGEN_ASOCIADA', codigo, nombre + ' -> ' + slot, 'OK']);
}

/** Agrega en memoria una fila de producto PENDIENTE. Devuelve su índice. */
function crearFilaPendiente_(ctx, codigo, carpetaId) {
  const t = ctx.tabla, map = t.map;
  const ahora = new Date();
  const fila = new Array(t.ancho).fill('');
  fila[map.ID] = ctx.siguienteId++;
  fila[map.CODIGO] = codigo;
  fila[map.MONEDA] = ctx.moneda;
  fila[map.DRIVE_FOLDER] = carpetaId;
  fila[map.ESTADO] = 'PENDIENTE';
  fila[map.DESTACADO] = false;
  fila[map.FECHA_CREACION] = ahora;
  fila[map.FECHA_ACTUALIZACION] = ahora;
  fila[map.OBSERVACIONES] = 'Creado automáticamente por importación de Drive';
  t.filas.push(fila);
  const idx = t.filas.length - 1;
  t.porCodigo.set(codigo, idx);
  return idx;
}

/**
 * Escribe en la hoja solo lo que cambió:
 *   - filas existentes: únicamente las columnas que toca la importación
 *     (imágenes, carpeta y fecha), en el rango mínimo de filas afectadas;
 *   - productos nuevos: se agregan al final en una sola escritura.
 */
function guardarCambiosImportacion_(ctx) {
  const t = ctx.tabla, map = t.map, sh = t.sh;

  if (ctx.tocadas.size) {
    const indices = Array.from(ctx.tocadas);
    const desde = Math.min.apply(null, indices), hasta = Math.max.apply(null, indices);
    const columnas = IMAGEN_SLOTS.concat(['DRIVE_FOLDER', 'FECHA_ACTUALIZACION']);
    columnas.forEach(function (col) {
      const c = map[col];
      const valores = [];
      for (let i = desde; i <= hasta; i++) valores.push([t.filas[i][c]]);
      sh.getRange(desde + 2, c + 1, valores.length, 1).setValues(valores);
    });
  }

  const nuevas = t.filas.slice(t.nOriginal);
  if (nuevas.length) {
    const inicio = Math.max(sh.getLastRow(), t.nOriginal + 1) + 1;
    asegurarFilas_(sh, inicio + nuevas.length - 1);
    sh.getRange(inicio, 1, nuevas.length, t.ancho).setValues(nuevas);
    sh.getRange(inicio, map.DESTACADO + 1, nuevas.length, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  }
}

function anotarError_(estado, ctx, codigo, mensaje) {
  estado.stats.errores++;
  anotarMuestra_(estado, mensaje);
  ctx.logs.push(['IMPORTACION_ERROR', codigo || '', mensaje, 'ERROR']);
}

function anotarMuestra_(estado, mensaje) {
  if (estado.muestra.length < LIMITES.MAX_ERRORES_MUESTRA) estado.muestra.push(mensaje);
}

// -----------------------------------------------------------------------------
// 4. CIERRE, RESUMEN Y CANCELACIÓN
// -----------------------------------------------------------------------------

/** Registra la importación terminada y limpia el estado. Llamar dentro de conLock_. */
function finalizarImportacion_(estado, cancelada) {
  const st = estado.stats;
  const erroresTexto = st.errores + ' errores, ' + st.conflictos + ' conflictos' +
    (cancelada ? ' — CANCELADA por el usuario' : '') +
    (estado.muestra.length ? '\n' + estado.muestra.join('\n') : '');
  const sh = hoja_(SHEETS.IMPORTACIONES);
  const map = mapaColumnas_(sh, HEADERS.IMPORTACIONES);
  const fila = new Array(sh.getLastColumn()).fill('');
  fila[map.FECHA] = new Date();
  fila[map.CARPETA_DRIVE] = celdaSegura_(estado.raizNombre + ' (' + estado.raiz + ')');
  fila[map.ARCHIVOS_ENCONTRADOS] = st.procesados;
  fila[map.PRODUCTOS_ASOCIADOS] = st.productosAsociados;
  fila[map.PRODUCTOS_NUEVOS] = st.nuevos;
  fila[map.ERRORES] = celdaSegura_(erroresTexto.slice(0, 45000));
  fila[map.USUARIO] = usuarioActual_() + ' (' + estado.origen + ')';
  const destino = sh.getLastRow() + 1;
  asegurarFilas_(sh, destino);
  sh.getRange(destino, 1, 1, fila.length).setValues([fila]);

  setConfig_('ULTIMA_IMPORTACION', fechaTexto_(new Date()));
  registrarLog_(cancelada ? 'IMPORTACION_CANCELADA' : 'IMPORTACION_TERMINADA', '',
    estado.raizNombre + ': ' + JSON.stringify(st), cancelada ? 'ADVERTENCIA' : 'OK');
  borrarEstado_();
  invalidarCacheApi_();
  estado.terminado = true;
  return construirResumen_(estado, cancelada);
}

/** Resumen apto para el panel y el menú (sin fechas Date). */
function construirResumen_(estado, cancelada) {
  const st = estado.stats;
  return {
    terminado: !!estado.terminado,
    cancelada: !!cancelada,
    carpeta: estado.raizNombre,
    total: estado.total,
    archivosProcesados: st.procesados,
    productosEncontrados: st.encontrados,
    productosNuevos: st.nuevos,
    imagenesAsociadas: st.asociadas,
    productosAsociados: st.productosAsociados,
    errores: st.errores,
    archivosIgnorados: st.ignorados,
    yaImportadas: st.yaImportadas,
    conflictos: st.conflictos,
    carpetasRevisadas: estado.carpetas,
    muestra: estado.muestra.slice()
  };
}

function formatearResumenImportacion_(r) {
  if (!r) return 'Sin datos.';
  if (r.mensaje) return r.mensaje;
  const lineas = [
    (r.terminado ? (r.cancelada ? '⏹️ Importación cancelada' : '✅ Importación terminada') : '⏳ Importación en pausa (límite de tiempo de Google)') +
      ' — carpeta: ' + r.carpeta,
    '',
    'Archivos procesados: ' + r.archivosProcesados,
    'Productos encontrados: ' + r.productosEncontrados,
    'Productos nuevos (PENDIENTE): ' + r.productosNuevos,
    'Imágenes asociadas: ' + r.imagenesAsociadas,
    'Errores: ' + r.errores,
    'Archivos ignorados: ' + r.archivosIgnorados,
    'Imágenes ya importadas antes (no duplicadas): ' + r.yaImportadas,
    'Conflictos (espacio de imagen ocupado): ' + r.conflictos
  ];
  if (!r.terminado) lineas.push('', 'Vuelve a ejecutar "Importar desde Drive" con la misma carpeta: continuará donde quedó.');
  if (r.muestra && r.muestra.length) lineas.push('', 'Detalle (primeros casos):', r.muestra.slice(0, 10).join('\n'));
  return lineas.join('\n');
}

function cancelarImportacion_() {
  return conLock_(function () {
    const e = cargarEstado_();
    if (!e) return null;
    return finalizarImportacion_(e, true);
  });
}

// -----------------------------------------------------------------------------
// 5. UTILIDADES DE DRIVE
// -----------------------------------------------------------------------------

function verificarCarpeta_(id) {
  try {
    DriveApp.getFolderById(id).getName();
  } catch (e) {
    throw new Error('No se encontró la carpeta o no tienes acceso a ella. Revisa el link/ID.');
  }
}

/** Cuenta archivos (incluye subcarpetas) para la barra de progreso. null si no alcanza el tiempo. */
function contarArchivos_(rootId, presupuestoMs) {
  const t0 = Date.now();
  const cola = [rootId];
  let total = 0;
  while (cola.length) {
    const carpeta = DriveApp.getFolderById(cola.shift());
    const archivos = carpeta.getFiles();
    while (archivos.hasNext()) {
      archivos.next();
      total++;
      if (Date.now() - t0 > presupuestoMs) return null;
    }
    const subs = carpeta.getFolders();
    while (subs.hasNext()) cola.push(subs.next().getId());
  }
  return total;
}

// -----------------------------------------------------------------------------
// 6. SINCRONIZACIÓN DIARIA (trigger opcional)
// -----------------------------------------------------------------------------

/**
 * Revisa la carpeta principal, asocia imágenes nuevas y registra cambios.
 * No borra nada. Si no termina, programa una continuación en 1 minuto.
 */
function sincronizacionDiaria() {
  const id = getConfig_('DRIVE_PRINCIPAL_ID');
  if (!id) {
    registrarLog_('SINCRONIZACION', '', 'No hay DRIVE_PRINCIPAL_ID en CONFIGURACION.', 'ERROR');
    return;
  }
  try {
    const r = importarProductosDesdeDrive(id, { origen: 'trigger' });
    if (r && !r.terminado) {
      programarContinuacion_();
      registrarLog_('SINCRONIZACION', '', 'Parcial: continuará en 1 minuto. ' + JSON.stringify(r), 'OK');
    } else {
      borrarContinuaciones_();
      registrarLog_('SINCRONIZACION', '', 'Completa. ' + JSON.stringify(r), 'OK');
    }
  } catch (e) {
    registrarLog_('SINCRONIZACION', '', e.message, 'ERROR');
  }
}

/** Handler del trigger de continuación (se autoelimina). */
function continuarSincronizacion() {
  borrarContinuaciones_();
  sincronizacionDiaria();
}

function programarContinuacion_() {
  borrarContinuaciones_();
  ScriptApp.newTrigger('continuarSincronizacion').timeBased().after(60 * 1000).create();
}

function borrarContinuaciones_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'continuarSincronizacion') ScriptApp.deleteTrigger(t);
  });
}
