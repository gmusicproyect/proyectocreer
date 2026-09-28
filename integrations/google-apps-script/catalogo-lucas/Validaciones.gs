/**
 * =============================================================================
 * Validaciones.gs — Auditoría de la base y resúmenes
 * -----------------------------------------------------------------------------
 * validarBase() revisa PRODUCTOS (y la carpeta principal de Drive) y escribe
 * cada problema en la hoja VALIDACION. No modifica ningún producto.
 * =============================================================================
 */

/**
 * Detecta: códigos duplicados o inválidos, IDs duplicados, productos sin nombre,
 * sin categoría (o con categoría inexistente), sin imagen, con precio vacío o
 * inválido, sin estado o con estado inválido, publicados incompletos, imágenes
 * usadas por más de un producto e imágenes de Drive sin producto.
 * @return {Object} resumen { total, errores, advertencias, porTipo, escaneoDrive }
 */
function validarBase() {
  const t = cargarTablaProductos_();
  const map = t.map;
  const categorias = cargarCategorias_().lista;
  const problemas = []; // [TIPO, SEVERIDAD, CODIGO, FILA, DETALLE]
  const agregar = function (tipo, sev, codigo, fila, detalle) { problemas.push([tipo, sev, codigo, fila, detalle]); };

  const filasPorCodigo = {}, filasPorId = {}, usoImagen = {};

  t.filas.forEach(function (f, i) {
    const filaHoja = i + 2;
    const filaVacia = f.every(function (v) { return v === '' || v === null || v === false; });
    if (filaVacia) return;
    const p = filaAProducto_(f, map, i);

    if (!p.codigo) { agregar('SIN_CODIGO', 'ERROR', '', filaHoja, 'Fila con datos pero sin CODIGO'); return; }
    if (!esCodigoValido_(p.codigo)) agregar('CODIGO_INVALIDO', 'ERROR', p.codigo, filaHoja, 'Formato de código no válido');
    (filasPorCodigo[p.codigo] = filasPorCodigo[p.codigo] || []).push(filaHoja);
    if (p.id) (filasPorId[p.id] = filasPorId[p.id] || []).push(filaHoja);

    if (!p.nombre) agregar('SIN_NOMBRE', 'ADVERTENCIA', p.codigo, filaHoja, 'Producto sin nombre');
    if (!p.categoria) agregar('SIN_CATEGORIA', 'ADVERTENCIA', p.codigo, filaHoja, 'Producto sin categoría');
    else if (!buscarCategoria_(categorias, p.categoria)) agregar('CATEGORIA_INEXISTENTE', 'ERROR', p.codigo, filaHoja, 'La categoría "' + p.categoria + '" no está en CATEGORIAS');
    if (!p.imagenes[0]) agregar('SIN_IMAGEN', 'ADVERTENCIA', p.codigo, filaHoja, 'Sin imagen principal');
    if (!p.precioValido) agregar('PRECIO_INVALIDO', 'ERROR', p.codigo, filaHoja, 'Precio no numérico o negativo: ' + texto_(p.precioBruto));
    else if (p.precio === null) agregar('PRECIO_VACIO', 'ADVERTENCIA', p.codigo, filaHoja, 'Precio vacío');
    if (!p.estado) agregar('SIN_ESTADO', 'ERROR', p.codigo, filaHoja, 'Producto sin estado');
    else if (ESTADOS.indexOf(p.estado) === -1) agregar('ESTADO_INVALIDO', 'ERROR', p.codigo, filaHoja, 'Estado "' + p.estado + '" no reconocido');
    if (p.estado === 'PUBLICADO' && esIncompleto_(p)) agregar('PUBLICADO_INCOMPLETO', 'ERROR', p.codigo, filaHoja, 'Está publicado pero le faltan datos (nombre, categoría, precio, descripción o imagen)');

    p.imagenes.forEach(function (id) {
      if (!id) return;
      (usoImagen[id] = usoImagen[id] || []).push(p.codigo);
    });
  });

  Object.keys(filasPorCodigo).forEach(function (c) {
    const filas = filasPorCodigo[c];
    if (filas.length > 1) agregar('CODIGO_DUPLICADO', 'ERROR', c, filas[0], 'Código repetido en las filas ' + filas.join(', '));
  });
  Object.keys(filasPorId).forEach(function (id) {
    const filas = filasPorId[id];
    if (filas.length > 1) agregar('ID_DUPLICADO', 'ADVERTENCIA', '', filas[0], 'ID ' + id + ' repetido en las filas ' + filas.join(', '));
  });
  Object.keys(usoImagen).forEach(function (id) {
    const codigos = usoImagen[id];
    if (codigos.length > 1) agregar('IMAGEN_REPETIDA', 'ERROR', codigos[0], '', 'La misma imagen de Drive está en: ' + codigos.join(', '));
  });

  // Imágenes en Drive que no tienen producto (aún no importadas o mal nombradas).
  const escaneo = escanearImagenesSinProducto_(new Set(Object.keys(filasPorCodigo)), LIMITES.ESCANEO_VALIDACION_MS);
  escaneo.sinProducto.forEach(function (x) { agregar('IMAGEN_SIN_PRODUCTO', 'ADVERTENCIA', x.codigo, '', x.nombre + ' (ejecuta Importar desde Drive para crearlo)'); });
  escaneo.invalidas.forEach(function (x) { agregar('IMAGEN_MAL_NOMBRADA', 'ADVERTENCIA', '', '', x.nombre + ': ' + x.motivo); });
  if (escaneo.estado === 'parcial') agregar('ESCANEO_PARCIAL', 'INFO', '', '', 'Se revisaron ' + escaneo.revisados + ' archivos de Drive antes del límite de tiempo.');
  if (escaneo.estado === 'sin_carpeta') agregar('SIN_CARPETA_PRINCIPAL', 'INFO', '', '', 'Configura DRIVE_PRINCIPAL_ID para detectar imágenes sin producto.');
  if (escaneo.estado === 'error') agregar('CARPETA_INACCESIBLE', 'ERROR', '', '', escaneo.mensaje);

  escribirValidacion_(problemas);

  const porTipo = {};
  let errores = 0, advertencias = 0;
  problemas.forEach(function (p) {
    porTipo[p[0]] = (porTipo[p[0]] || 0) + 1;
    if (p[1] === 'ERROR') errores++;
    else if (p[1] === 'ADVERTENCIA') advertencias++;
  });
  registrarLog_('VALIDACION', '', errores + ' errores, ' + advertencias + ' advertencias', errores ? 'ADVERTENCIA' : 'OK');
  return {
    productosRevisados: Object.keys(filasPorCodigo).length,
    errores: errores, advertencias: advertencias, porTipo: porTipo,
    escaneoDrive: { estado: escaneo.estado, revisados: escaneo.revisados }
  };
}

/** Recorre DRIVE_PRINCIPAL_ID buscando imágenes cuyo código no existe en PRODUCTOS. */
function escanearImagenesSinProducto_(codigos, presupuestoMs) {
  const res = { sinProducto: [], invalidas: [], revisados: 0, estado: 'completo', mensaje: '' };
  const rootId = extraerIdCarpeta_(getConfig_('DRIVE_PRINCIPAL_ID'));
  if (!rootId) { res.estado = 'sin_carpeta'; return res; }
  const t0 = Date.now();
  const vistos = {};
  try {
    const cola = [rootId];
    while (cola.length) {
      const carpeta = DriveApp.getFolderById(cola.shift());
      const archivos = carpeta.getFiles();
      while (archivos.hasNext()) {
        if (Date.now() - t0 > presupuestoMs) { res.estado = 'parcial'; return res; }
        const f = archivos.next();
        res.revisados++;
        if (f.isTrashed()) continue;
        const info = parsearNombreArchivo_(f.getName());
        if (info.tipo === 'ignorado') continue;
        if (info.tipo === 'error') { res.invalidas.push({ nombre: f.getName(), motivo: info.motivo }); continue; }
        if (!/^image\//.test(f.getMimeType())) { res.invalidas.push({ nombre: f.getName(), motivo: 'Drive no lo reconoce como imagen' }); continue; }
        if (!codigos.has(info.codigo) && !vistos[info.codigo]) {
          vistos[info.codigo] = true;
          res.sinProducto.push({ codigo: info.codigo, nombre: f.getName() });
        }
      }
      const subs = carpeta.getFolders();
      while (subs.hasNext()) cola.push(subs.next().getId());
    }
  } catch (e) {
    res.estado = 'error';
    res.mensaje = 'No se pudo leer la carpeta principal: ' + e.message;
  }
  return res;
}

function escribirValidacion_(problemas) {
  const sh = hoja_(SHEETS.VALIDACION);
  const n = sh.getLastRow();
  if (n > 1) sh.getRange(2, 1, n - 1, HEADERS.VALIDACION.length).clearContent();
  if (!problemas.length) {
    sh.getRange(2, 1, 1, HEADERS.VALIDACION.length).setValues([['SIN_PROBLEMAS', 'INFO', '', '', 'Validación ' + fechaTexto_(new Date()) + ': sin problemas']]);
    return;
  }
  const orden = { ERROR: 0, ADVERTENCIA: 1, INFO: 2 };
  problemas.sort(function (a, b) { return (orden[a[1]] - orden[b[1]]) || String(a[0]).localeCompare(String(b[0])); });
  asegurarFilas_(sh, problemas.length + 1);
  sh.getRange(2, 1, problemas.length, HEADERS.VALIDACION.length)
    .setValues(problemas.map(function (p) { return p.map(celdaSegura_); }));
}

/** Resumen general para el menú "Generar resumen" y el panel. */
function generarResumen() {
  const productos = leerProductos_();
  const categorias = cargarCategorias_().lista;
  const stats = calcularEstadisticas_(productos, categorias);
  const porCategoria = {};
  productos.forEach(function (p) {
    const c = p.categoria || '(sin categoría)';
    porCategoria[c] = porCategoria[c] || { total: 0, publicados: 0 };
    porCategoria[c].total++;
    if (p.estado === 'PUBLICADO') porCategoria[c].publicados++;
  });
  return {
    negocio: getConfig_('NOMBRE_NEGOCIO'),
    stats: stats,
    porCategoria: porCategoria,
    ultimaImportacion: getConfig_('ULTIMA_IMPORTACION') || 'nunca',
    version: APP.VERSION
  };
}

function formatearResumenGeneral_(r) {
  const s = r.stats;
  const lineas = [
    'Total de productos: ' + s.total,
    'Publicados: ' + s.publicados + ' · Pendientes: ' + s.pendientes + ' · Ocultos: ' + s.ocultos + ' · Borradores: ' + s.borradores,
    'Categorías activas: ' + s.categorias,
    'Sin imagen principal: ' + s.sinImagen,
    'Incompletos: ' + s.incompletos,
    'Última importación: ' + r.ultimaImportacion,
    '',
    'Por categoría (total / publicados):'
  ];
  Object.keys(r.porCategoria).sort().forEach(function (c) {
    lineas.push('  • ' + c + ': ' + r.porCategoria[c].total + ' / ' + r.porCategoria[c].publicados);
  });
  return lineas.join('\n');
}
