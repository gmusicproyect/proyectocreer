/**
 * =============================================================================
 * Code.gs — Punto de entrada del sistema
 * -----------------------------------------------------------------------------
 *   1. Menú "CATÁLOGO LUCAS"
 *   2. Inicialización / reparación de hojas
 *   3. Apertura del panel HTML
 *   4. Acciones del menú
 *   5. Triggers (sincronización diaria)
 *   6. Funciones que llama el panel (google.script.run)
 *
 * Las funciones que terminan en "_" son privadas: el panel no puede llamarlas.
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// 1. MENÚ
// -----------------------------------------------------------------------------

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu(APP.NOMBRE_MENU)
    .addItem('🧭 Abrir panel', 'abrirPanel')
    .addItem('📥 Importar desde Drive', 'menuImportarDesdeDrive')
    .addItem('➕ Nuevo producto', 'menuNuevoProducto')
    .addItem('🔎 Buscar producto', 'menuBuscarProducto')
    .addSeparator()
    .addItem('✅ Validar base', 'menuValidarBase')
    .addItem('📊 Generar resumen', 'menuGenerarResumen')
    .addItem('⚠️ Ver errores', 'menuVerErrores')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Sistema')
      .addItem('Inicializar / reparar hojas', 'inicializarSistema')
      .addItem('Activar sincronización diaria', 'activarSincronizacionDiaria')
      .addItem('Desactivar sincronización diaria', 'desactivarSincronizacionDiaria')
      .addItem('Cancelar importación en curso', 'menuCancelarImportacion'))
    .addToUi();
}

/**
 * Disparador simple: cuando alguien edita PRODUCTOS a mano, se actualiza
 * FECHA_ACTUALIZACION de esas filas. Así el panel detecta que la fila cambió
 * y no pisa el trabajo hecho directamente en la hoja.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sh = e.range.getSheet();
    if (sh.getName() !== SHEETS.PRODUCTOS) return;
    const desde = Math.max(e.range.getRow(), 2);
    const hasta = e.range.getLastRow();
    if (hasta < desde) return;
    const map = mapaColumnas_(sh, ['FECHA_ACTUALIZACION']);
    const col = map.FECHA_ACTUALIZACION + 1;
    // Editar solo la columna de fecha no cuenta como cambio.
    if (e.range.getColumn() === col && e.range.getLastColumn() === col) return;
    const ahora = new Date();
    const valores = [];
    for (let r = desde; r <= hasta; r++) valores.push([ahora]);
    sh.getRange(desde, col, valores.length, 1).setValues(valores);
  } catch (err) {
    // Un disparador simple nunca debe interrumpir la edición.
  }
}

// -----------------------------------------------------------------------------
// 2. INICIALIZACIÓN
// -----------------------------------------------------------------------------

/**
 * Crea las hojas que falten, escribe encabezados, agrega columnas faltantes
 * al final (sin mover ni borrar nada), valores por defecto de CONFIGURACION,
 * listas desplegables y formato. Se puede ejecutar varias veces sin riesgo.
 */
function inicializarSistema() {
  const ss = ss_();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  const informe = Object.keys(HEADERS).map(function (nombre) {
    return prepararHoja_(ss, SHEETS[nombre], HEADERS[nombre]);
  });
  sembrarConfiguracion_();
  formatearHojaCotizacionItems_();
  formatearHojaProductos_();
  formatearHojaCategorias_();
  formatearHojaCotizaciones_();
  formatearHojaCostos_();
  eliminarHojaVaciaPorDefecto_(ss);
  registrarLog_('INICIALIZACION', '', informe.join(' | '), 'OK');
  mostrarAlerta_('Sistema inicializado (v' + APP.VERSION + ')', informe.join('\n'));
  return informe;
}

function prepararHoja_(ss, nombre, encabezados) {
  let sh = ss.getSheetByName(nombre);
  const creada = !sh;
  if (!sh) sh = ss.insertSheet(nombre);
  const ultimaCol = sh.getLastColumn();
  const actuales = ultimaCol ? sh.getRange(1, 1, 1, ultimaCol).getValues()[0].map(function (h) { return String(h).trim().toUpperCase(); }) : [];
  let mensaje;
  if (actuales.every(function (h) { return !h; })) {
    asegurarColumnas_(sh, encabezados.length);
    sh.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
    mensaje = (creada ? '✅ ' + nombre + ': creada' : '✅ ' + nombre + ': encabezados escritos');
  } else {
    const faltan = encabezados.filter(function (h) { return actuales.indexOf(h) === -1; });
    if (faltan.length) {
      asegurarColumnas_(sh, ultimaCol + faltan.length);
      sh.getRange(1, ultimaCol + 1, 1, faltan.length).setValues([faltan]);
      mensaje = '🛠️ ' + nombre + ': se agregaron columnas ' + faltan.join(', ');
    } else {
      mensaje = '✔️ ' + nombre + ': correcta';
    }
  }
  const total = sh.getLastColumn();
  sh.getRange(1, 1, 1, total).setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  return mensaje;
}

function sembrarConfiguracion_() {
  const defectos = valoresConfigPorDefecto_();
  __configCache = null;
  const actuales = leerConfig_();
  const faltantes = CLAVES_CONFIG.filter(function (k) { return actuales[k] === undefined; });
  if (faltantes.length) {
    const sh = hoja_(SHEETS.CONFIGURACION);
    const inicio = sh.getLastRow() + 1;
    asegurarFilas_(sh, inicio + faltantes.length - 1);
    sh.getRange(inicio, 1, faltantes.length, 2).setValues(faltantes.map(function (k) { return [k, defectos[k]]; }));
  }
  setConfig_('VERSION_SISTEMA', APP.VERSION);
}

function formatearHojaProductos_() {
  const sh = hoja_(SHEETS.PRODUCTOS);
  const map = mapaColumnas_(sh, HEADERS.PRODUCTOS);
  const filasMax = sh.getMaxRows() - 1;
  const ultima = Math.max(sh.getLastRow(), 1);

  // ESTADO: lista desplegable estricta.
  sh.getRange(2, map.ESTADO + 1, filasMax, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS.slice(), true).setAllowInvalid(false).build());

  // CATEGORIA: desplegable desde la hoja CATEGORIAS (se permite escribir, validarBase avisa).
  const shCat = hoja_(SHEETS.CATEGORIAS);
  const mapCat = mapaColumnas_(shCat, HEADERS.CATEGORIAS);
  const rangoCat = shCat.getRange(2, mapCat.NOMBRE + 1, Math.max(shCat.getMaxRows() - 1, 1), 1);
  sh.getRange(2, map.CATEGORIA + 1, filasMax, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(rangoCat, true).setAllowInvalid(true).build());

  // DESTACADO: casilla solo en filas con datos (una casilla vacía cuenta como fila usada).
  if (ultima > 1) {
    const rango = sh.getRange(2, map.DESTACADO + 1, ultima - 1, 1);
    const valores = rango.getValues().map(function (f) { return [aBooleano_(f[0])]; });
    rango.setValues(valores);
    rango.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  }

  sh.getRange(2, map.PRECIO + 1, filasMax, 1).setNumberFormat('#,##0.00');
  sh.getRange(2, map.FECHA_CREACION + 1, filasMax, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange(2, map.FECHA_ACTUALIZACION + 1, filasMax, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange(2, map.CODIGO + 1, filasMax, 1).setNumberFormat('@'); // el código siempre es texto

  // Resaltar en rojo los códigos duplicados.
  const letra = letraColumna_(map.CODIGO + 1);
  const rangoCodigo = sh.getRange(2, map.CODIGO + 1, filasMax, 1);
  const regla = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($' + letra + '2<>"",COUNTIF($' + letra + ':$' + letra + ',$' + letra + '2)>1)')
    .setBackground('#fecaca').setFontColor('#991b1b')
    .setRanges([rangoCodigo]).build();
  const otras = sh.getConditionalFormatRules().filter(function (r) {
    return !r.getRanges().some(function (rg) { return rg.getColumn() === map.CODIGO + 1; });
  });
  otras.push(regla);
  sh.setConditionalFormatRules(otras);

  sh.setColumnWidth(map.DESCRIPCION + 1, 320);
  sh.setColumnWidth(map.NOMBRE + 1, 220);
}

function formatearHojaCategorias_() {
  const sh = hoja_(SHEETS.CATEGORIAS);
  const map = mapaColumnas_(sh, HEADERS.CATEGORIAS);
  const ultima = sh.getLastRow();
  if (ultima > 1) {
    sh.getRange(2, map.ACTIVA + 1, ultima - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  }
}

/** Estado de seguimiento como lista desplegable (permite valores antiguos) y fecha legible. */
function formatearHojaCotizaciones_() {
  const sh = hoja_(SHEETS.COTIZACIONES);
  const map = mapaColumnas_(sh, ['ESTADO', 'FECHA_ACTUALIZACION']);
  const filas = Math.max(sh.getMaxRows() - 1, 1);
  sh.getRange(2, map.ESTADO + 1, filas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS_COTIZACION.slice(), true).setAllowInvalid(true).build());
  sh.getRange(2, map.FECHA_ACTUALIZACION + 1, filas, 1).setNumberFormat('yyyy-mm-dd hh:mm');
}

/**
 * COSTOS es privada: el catálogo público nunca la lee. Quien tenga acceso a la
 * planilla sí la ve, por eso la planilla solo se comparte con personas que
 * pueden conocer los costos.
 */
function formatearHojaCostos_() {
  const sh = hoja_(SHEETS.COSTOS);
  const map = mapaColumnas_(sh, HEADERS.COSTOS);
  const filas = Math.max(sh.getMaxRows() - 1, 1);
  sh.getRange(2, map.CODIGO + 1, filas, 1).setNumberFormat('@');
  sh.getRange(2, map.COSTO + 1, filas, 1).setNumberFormat('#,##0.00');
  sh.getRange(2, map.FECHA_ACTUALIZACION + 1, filas, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sh.setTabColor('#991b1b');
}

/** Conserva códigos con ceros iniciales y repara filas antiguas por nombre. */
function formatearHojaCotizacionItems_() {
  const sh = hoja_(SHEETS.COTIZACION_ITEMS);
  const map = mapaColumnas_(sh, HEADERS.COTIZACION_ITEMS);
  sh.getRange(2, map.CODIGO + 1, Math.max(sh.getMaxRows() - 1, 1), 1)
    .setNumberFormat('@');

  const ultima = sh.getLastRow();
  if (ultima <= 1) return;
  const productos = leerProductos_();
  const codigos = {};
  const porNombre = {};
  productos.forEach(function (producto) {
    codigos[producto.codigo] = true;
    const clave = claveBusqueda_(producto.nombre);
    if (!porNombre[clave]) porNombre[clave] = [];
    porNombre[clave].push(producto.codigo);
  });

  const rango = sh.getRange(2, 1, ultima - 1, sh.getLastColumn());
  const filas = rango.getValues();
  let cambio = false;
  filas.forEach(function (fila) {
    const codigo = normalizarCodigo_(fila[map.CODIGO]);
    if (codigos[codigo]) {
      fila[map.CODIGO] = codigo;
      return;
    }
    const coincidencias = porNombre[claveBusqueda_(fila[map.NOMBRE])] || [];
    if (coincidencias.length === 1) {
      fila[map.CODIGO] = coincidencias[0];
      cambio = true;
    }
  });
  if (cambio) rango.setValues(filas);
}

/** Borra "Hoja 1"/"Sheet1" solo si está completamente vacía. */
function eliminarHojaVaciaPorDefecto_(ss) {
  ['Hoja 1', 'Hoja1', 'Sheet1', 'Planilha1', 'Página1'].forEach(function (n) {
    const sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && sh.getLastColumn() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
}

// -----------------------------------------------------------------------------
// 3. PANEL
// -----------------------------------------------------------------------------

function abrirPanel() {
  mostrarPanel_('dashboard');
}

function mostrarPanel_(vista) {
  const t = HtmlService.createTemplateFromFile('Panel');
  t.boot = JSON.stringify({ vista: vista || 'dashboard' }).replace(/</g, '\\u003c');
  const html = t.evaluate().setWidth(1200).setHeight(780);
  SpreadsheetApp.getUi().showModelessDialog(html, APP.NOMBRE_MENU);
}

/** Inserta Styles.html / Scripts.html dentro de Panel.html. */
function include(nombre) {
  if (['Styles', 'Scripts'].indexOf(nombre) === -1) return '';
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}

// -----------------------------------------------------------------------------
// 4. ACCIONES DEL MENÚ
// -----------------------------------------------------------------------------

function menuImportarDesdeDrive() {
  const ui = SpreadsheetApp.getUi();
  const actual = getConfig_('DRIVE_PRINCIPAL_ID');
  const resp = ui.prompt('Importar desde Drive',
    'Pega el link o el ID de la carpeta de imágenes.' + (actual ? '\nDéjalo vacío para usar la carpeta principal configurada.' : ''),
    ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const entrada = resp.getResponseText().trim() || actual;
  if (!entrada) { ui.alert('No indicaste ninguna carpeta.'); return; }
  try {
    const resumen = importarProductosDesdeDrive(entrada, { origen: 'menu' });
    if (!actual) setConfig_('DRIVE_PRINCIPAL_ID', extraerIdCarpeta_(entrada));
    ui.alert('Resultado de la importación', formatearResumenImportacion_(resumen), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ ' + e.message);
  }
}

function menuNuevoProducto() {
  mostrarPanel_('nuevo');
}

function menuBuscarProducto() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Buscar producto', 'Escribe el código o parte del nombre:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const resultados = buscarProductos_(resp.getResponseText());
  if (!resultados.length) { ui.alert('No se encontraron productos.'); return; }
  const sh = hoja_(SHEETS.PRODUCTOS);
  sh.activate();
  sh.setActiveRange(sh.getRange(resultados[0].fila, 1, 1, sh.getLastColumn()));
  if (resultados.length > 1) {
    const lista = resultados.slice(0, 15).map(function (p) { return 'Fila ' + p.fila + ': ' + p.codigo + ' — ' + (p.nombre || '(sin nombre)'); });
    ui.alert(resultados.length + ' coincidencias (se marcó la primera)', lista.join('\n') + (resultados.length > 15 ? '\n…' : ''), ui.ButtonSet.OK);
  }
}

function menuValidarBase() {
  const ui = SpreadsheetApp.getUi();
  try {
    const r = validarBase();
    const tipos = Object.keys(r.porTipo).map(function (k) { return '  • ' + k + ': ' + r.porTipo[k]; });
    ui.alert('Validación de la base',
      'Productos revisados: ' + r.productosRevisados + '\nErrores: ' + r.errores + '\nAdvertencias: ' + r.advertencias +
      (tipos.length ? '\n\n' + tipos.join('\n') : '') + '\n\nEl detalle está en la hoja VALIDACION.', ui.ButtonSet.OK);
    hoja_(SHEETS.VALIDACION).activate();
  } catch (e) {
    ui.alert('❌ ' + e.message);
  }
}

function menuGenerarResumen() {
  const ui = SpreadsheetApp.getUi();
  try {
    ui.alert('Resumen del catálogo', formatearResumenGeneral_(generarResumen()), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ ' + e.message);
  }
}

/** Muestra los últimos errores/advertencias de LOGS y el conteo de VALIDACION. */
function menuVerErrores() {
  const sh = hoja_(SHEETS.LOGS);
  const n = sh.getLastRow() - 1;
  const filas = n > 0 ? sh.getRange(Math.max(2, sh.getLastRow() - 1999), 1, Math.min(n, 2000), 5).getValues() : [];
  const errores = filas.filter(function (f) { return f[4] === 'ERROR' || f[4] === 'ADVERTENCIA'; }).slice(-40).reverse();

  const shVal = hoja_(SHEETS.VALIDACION);
  const nv = shVal.getLastRow() - 1;
  const val = nv > 0 ? shVal.getRange(2, 2, nv, 1).getValues().map(function (f) { return f[0]; }) : [];
  const valErr = val.filter(function (v) { return v === 'ERROR'; }).length;
  const valAdv = val.filter(function (v) { return v === 'ADVERTENCIA'; }).length;

  const filasHtml = errores.map(function (f) {
    return '<tr><td>' + escaparHtml_(fechaTexto_(f[0])) + '</td><td>' + escaparHtml_(f[1]) + '</td><td>' +
      escaparHtml_(f[2]) + '</td><td>' + escaparHtml_(String(f[3]).slice(0, 300)) + '</td><td class="' +
      (f[4] === 'ERROR' ? 'e' : 'a') + '">' + escaparHtml_(f[4]) + '</td></tr>';
  }).join('');
  const html = '<style>body{font:13px system-ui,sans-serif;color:#111;margin:12px}table{border-collapse:collapse;width:100%}' +
    'td,th{border-bottom:1px solid #e5e7eb;padding:6px;text-align:left;vertical-align:top}th{background:#f3f4f6}' +
    '.e{color:#b91c1c;font-weight:600}.a{color:#b45309;font-weight:600}.box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:12px}</style>' +
    '<div class="box"><b>Última validación:</b> ' + valErr + ' errores, ' + valAdv + ' advertencias (detalle en la hoja VALIDACION).</div>' +
    (errores.length
      ? '<table><tr><th>Fecha</th><th>Acción</th><th>Código</th><th>Detalle</th><th>Resultado</th></tr>' + filasHtml + '</table>'
      : '<p>No hay errores recientes en LOGS. ✅</p>');
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(900).setHeight(560), 'Errores recientes');
}

function menuCancelarImportacion() {
  const ui = SpreadsheetApp.getUi();
  const e = cargarEstado_();
  if (!e) { ui.alert('No hay ninguna importación en curso.'); return; }
  const ok = ui.alert('Cancelar importación', '¿Cancelar la importación de "' + e.raizNombre + '"? Lo ya importado se conserva.', ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  const r = cancelarImportacion_();
  ui.alert(formatearResumenImportacion_(r));
}

function mostrarAlerta_(titulo, mensaje) {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(titulo, mensaje, ui.ButtonSet.OK);
  } catch (e) {
    // Sin interfaz (trigger o editor): se ignora.
  }
}

// -----------------------------------------------------------------------------
// 5. TRIGGERS
// -----------------------------------------------------------------------------

function activarSincronizacionDiaria() {
  if (!getConfig_('DRIVE_PRINCIPAL_ID')) {
    mostrarAlerta_('Falta la carpeta', 'Primero escribe DRIVE_PRINCIPAL_ID en la hoja CONFIGURACION (o haz una importación).');
    return;
  }
  quitarTriggers_(['sincronizacionDiaria']);
  ScriptApp.newTrigger('sincronizacionDiaria').timeBased().everyDays(1).atHour(3).create();
  registrarLog_('TRIGGER', '', 'Sincronización diaria activada (03:00)', 'OK');
  mostrarAlerta_('Sincronización activada', 'Se revisará la carpeta principal todos los días cerca de las 03:00.\nNunca borra datos: solo agrega productos e imágenes nuevas.');
}

function desactivarSincronizacionDiaria() {
  const n = quitarTriggers_(['sincronizacionDiaria', 'continuarSincronizacion']);
  registrarLog_('TRIGGER', '', 'Sincronización diaria desactivada (' + n + ' triggers)', 'OK');
  mostrarAlerta_('Sincronización desactivada', 'Se eliminaron ' + n + ' programaciones.');
}

function quitarTriggers_(handlers) {
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (handlers.indexOf(t.getHandlerFunction()) !== -1) { ScriptApp.deleteTrigger(t); n++; }
  });
  return n;
}

// -----------------------------------------------------------------------------
// 6. FUNCIONES DEL PANEL (google.script.run)
//    Todo lo que entra se valida en Productos.gs; los errores llegan al panel
//    como mensaje legible.
// -----------------------------------------------------------------------------

function panelInit() {
  const estado = cargarEstado_();
  return {
    negocio: getConfig_('NOMBRE_NEGOCIO') || 'Catálogo',
    moneda: getConfig_('MONEDA') || APP.MONEDA_DEFECTO,
    estados: ESTADOS.slice(),
    categorias: cargarCategorias_().lista.map(function (c) { return { nombre: c.nombre, activa: c.activa }; }),
    carpetaPrincipal: getConfig_('DRIVE_PRINCIPAL_ID'),
    importacionEnCurso: estado && !estado.terminado ? construirResumen_(estado) : null,
    version: APP.VERSION
  };
}

function panelListarProductos() {
  const productos = leerProductos_();
  const categorias = cargarCategorias_().lista;
  return {
    productos: productos.map(productoParaLista_),
    stats: calcularEstadisticas_(productos, categorias)
  };
}

function panelObtenerProducto(codigo) {
  const c = normalizarCodigo_(codigo);
  const p = leerProductos_().filter(function (x) { return x.codigo === c; })[0];
  if (!p) throw new Error('No existe el producto ' + c + '.');
  return productoParaFormulario_(p);
}

/** modo: 'crear' | 'editar' */
function panelGuardarProducto(data, modo) {
  if (modo !== 'crear' && modo !== 'editar') throw new Error('Operación no válida.');
  const p = modo === 'crear' ? crearProducto_(data) : actualizarProducto_(data && data.codigo, data);
  return productoParaLista_(p);
}

function panelCambiarEstado(codigo, estado) {
  const e = texto_(estado).toUpperCase();
  if (ESTADOS.indexOf(e) === -1) throw new Error('Estado no válido.');
  return productoParaLista_(cambiarEstadoProducto_(codigo, e));
}

function panelEliminarProducto(codigo, confirmacion) {
  return eliminarProducto_(codigo, confirmacion);
}

function panelCrearCategoria(nombre) {
  return crearCategoria_(nombre, '');
}

function panelImportarIniciar(entrada) {
  const rootId = extraerIdCarpeta_(entrada);
  if (!rootId) throw new Error('El link o ID de la carpeta no es válido.');
  verificarCarpeta_(rootId);
  return conLock_(function () {
    let e = cargarEstado_();
    let reanudada = true;
    if (!e || e.terminado || e.raiz !== rootId) {
      e = nuevoEstado_(rootId, 'panel');
      e.total = contarArchivos_(rootId, LIMITES.CONTEO_MS);
      guardarEstado_(e);
      reanudada = false;
    }
    if (!getConfig_('DRIVE_PRINCIPAL_ID')) setConfig_('DRIVE_PRINCIPAL_ID', rootId);
    const r = construirResumen_(e);
    r.reanudada = reanudada;
    return r;
  });
}

function panelImportarLote() {
  return conLock_(function () {
    const e = cargarEstado_();
    if (!e) return { terminado: true, sinEstado: true };
    procesarLote_(e, LIMITES.LOTE_PANEL_MS, LIMITES.LOTE_PANEL_ARCHIVOS);
    if (e.terminado) return finalizarImportacion_(e);
    guardarEstado_(e);
    return construirResumen_(e);
  });
}

function panelImportarCancelar() {
  return cancelarImportacion_();
}

function panelValidarBase() {
  return validarBase();
}
