/**
 * =============================================================================
 * Api.gs — Datos para el catálogo web futuro + estructura para IA
 * -----------------------------------------------------------------------------
 *   getProductosPublicados()           -> array de productos PUBLICADOS
 *   getProductosPorCategoria(cat)      -> igual, filtrado por categoría
 *   getProductosPublicadosJSON()       -> el mismo array como texto JSON
 *   doGet(e)                           -> endpoint JSON si se publica como Web App
 *   generarDescripcionIA(producto)     -> estructura preparada (sin llamada a API)
 *
 * Seguridad: solo salen campos públicos. Nunca se exponen ID interno, carpeta
 * de Drive, observaciones, fechas ni productos que no estén PUBLICADOS.
 * Las imágenes se entregan como URL; para que se vean en una web pública, los
 * archivos deben estar compartidos como "Cualquier persona con el enlace".
 * =============================================================================
 */

const CACHE_API_CLAVE = 'API_PUBLICADOS_V1';

/** URL pública de una imagen de Drive (requiere que el archivo esté compartido). */
function urlImagenPublica_(id) {
  return id ? 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(id) : '';
}

/** Convierte un producto interno al formato público. */
function productoPublico_(p) {
  const imagenes = p.imagenes.filter(String).map(urlImagenPublica_);
  return {
    codigo: p.codigo,
    nombre: p.nombre,
    categoria: p.categoria,
    subcategoria: p.subcategoria,
    descripcion: p.descripcion,
    precio: p.precio,
    moneda: p.moneda || APP.MONEDA_DEFECTO,
    imagenPrincipal: urlImagenPublica_(p.imagenes[0]),
    imagenes: imagenes,
    destacado: p.destacado
  };
}

/**
 * Productos con ESTADO = PUBLICADO cuya categoría esté activa.
 * Orden: destacados primero, luego orden de categoría, luego nombre.
 */
function getProductosPublicados() {
  const cache = CacheService.getScriptCache();
  const enCache = cache.get(CACHE_API_CLAVE);
  if (enCache) return JSON.parse(enCache);

  const categorias = cargarCategorias_().lista;
  const ordenCat = {};
  const activas = {};
  categorias.forEach(function (c) {
    ordenCat[claveBusqueda_(c.nombre)] = c.orden;
    if (c.activa) activas[claveBusqueda_(c.nombre)] = true;
  });

  const lista = leerProductos_()
    .filter(function (p) {
      return p.estado === 'PUBLICADO' &&
        activas[claveBusqueda_(p.categoria)] &&
        !esIncompleto_(p);
    })
    .sort(function (a, b) {
      if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
      const oa = ordenCat[claveBusqueda_(a.categoria)] || 9999, ob = ordenCat[claveBusqueda_(b.categoria)] || 9999;
      return oa - ob || a.nombre.localeCompare(b.nombre);
    })
    .map(productoPublico_);

  const json = JSON.stringify(lista);
  if (json.length < 95000) cache.put(CACHE_API_CLAVE, json, LIMITES.CACHE_API_SEG);
  return lista;
}

/** Productos publicados de una categoría (acepta nombre o slug, sin importar acentos). */
function getProductosPorCategoria(categoria) {
  const cat = buscarCategoria_(cargarCategorias_().lista, categoria);
  if (!cat) return [];
  const clave = claveBusqueda_(cat.nombre);
  return getProductosPublicados().filter(function (p) { return claveBusqueda_(p.categoria) === clave; });
}

function getProductosPublicadosJSON() {
  return JSON.stringify(getProductosPublicados());
}

function invalidarCacheApi_() {
  try { CacheService.getScriptCache().remove(CACHE_API_CLAVE); } catch (e) { /* sin caché no pasa nada */ }
}

/**
 * Endpoint para la web futura (Implementar > Nueva implementación > Aplicación web).
 *   .../exec                      -> todos los publicados
 *   .../exec?categoria=mochilas   -> solo esa categoría
 */
function doGet(e) {
  const params = (e && e.parameter) || {};
  let cuerpo;
  try {
    const categoria = texto_(params.categoria).slice(0, 80);
    const productos = categoria ? getProductosPorCategoria(categoria) : getProductosPublicados();
    cuerpo = { ok: true, total: productos.length, generado: new Date().toISOString(), productos: productos };
  } catch (err) {
    cuerpo = { ok: false, error: 'No se pudo leer el catálogo.' }; // sin detalles internos
    registrarLog_('API_ERROR', '', err.message, 'ERROR');
  }
  return ContentService.createTextOutput(JSON.stringify(cuerpo)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Punto de recepción de cotizaciones. El secreto se guarda en Propiedades del
 * script como QUOTE_API_TOKEN y nunca en una celda ni en el navegador.
 */
function doPost(e) {
  let cuerpo;
  try {
    const esperado = PropertiesService.getScriptProperties().getProperty('QUOTE_API_TOKEN');
    if (!esperado) throw new Error('La recepción de cotizaciones no está configurada.');
    const entrada = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const recibido = texto_(entrada.apiToken);
    if (!recibido || recibido !== esperado) throw new Error('Solicitud no autorizada.');
    delete entrada.apiToken;
    cuerpo = registrarSolicitudWeb_(entrada);
  } catch (err) {
    registrarLog_('COTIZACION_WEB_ERROR', '', err.message, 'ERROR');
    cuerpo = { ok: false, error: 'No se pudo registrar la solicitud.' };
  }
  return ContentService.createTextOutput(JSON.stringify(cuerpo))
    .setMimeType(ContentService.MimeType.JSON);
}

// -----------------------------------------------------------------------------
// DESCRIPCIONES CON IA (estructura preparada, SIN llamadas a API todavía)
// -----------------------------------------------------------------------------

const IA_CONFIG = Object.freeze({
  HABILITADA: false,          // cambiar a true cuando exista llamarGemini_()
  PROVEEDOR: 'GEMINI',
  MAX_DESCRIPCION: 800,
  MAX_RESUMEN: 160,
  MAX_PALABRAS_CLAVE: 10
});

/**
 * Prepara la generación de textos comerciales para un producto.
 * @param {Object|string} producto Objeto producto o código.
 * @return {Object} { ok, motivo, entrada, prompt, resultado }
 */
function generarDescripcionIA(producto) {
  const p = typeof producto === 'string' ? buscarProductos_(producto)[0] : producto;
  if (!p || !p.codigo) throw new Error('Producto no encontrado.');
  const entrada = prepararEntradaIA_(p);
  const prompt = construirPromptIA_(entrada);

  if (!IA_CONFIG.HABILITADA) {
    return { ok: false, motivo: 'La IA todavía no está conectada.', entrada: entrada, prompt: prompt, resultado: null };
  }
  // Cuando se implemente:
  //   const respuesta = llamarGemini_(prompt);            // texto JSON devuelto por el modelo
  //   return validarRespuestaIA_(respuesta, entrada);
  throw new Error('llamarGemini_() aún no está implementada.');
}

/** Solo los datos que el modelo puede usar. Nada más. */
function prepararEntradaIA_(p) {
  return {
    codigo: p.codigo,
    nombre: p.nombre,
    categoria: p.categoria,
    subcategoria: p.subcategoria || '',
    datosTecnicos: p.descripcion || ''   // texto original del proveedor
  };
}

function construirPromptIA_(entrada) {
  return [
    'Eres redactor comercial de un catálogo de productos promocionales.',
    'Escribe en español a partir EXCLUSIVAMENTE de los datos entregados.',
    'REGLAS OBLIGATORIAS:',
    '1. No inventes características técnicas, medidas, materiales, capacidades, colores ni certificaciones que no estén en los datos.',
    '2. Si un dato no está, no lo menciones.',
    '3. Todo número que escribas debe aparecer tal cual en los datos.',
    '4. Responde SOLO con JSON válido con esta forma:',
    '{"descripcion": "máx ' + IA_CONFIG.MAX_DESCRIPCION + ' caracteres", "resumen": "máx ' + IA_CONFIG.MAX_RESUMEN + ' caracteres", "palabrasClave": ["máx ' + IA_CONFIG.MAX_PALABRAS_CLAVE + '"]}',
    '',
    'DATOS:',
    JSON.stringify(entrada)
  ].join('\n');
}

/**
 * Valida lo que devuelva el modelo. Rechaza la respuesta si:
 *  - no es JSON con las tres claves,
 *  - supera los largos,
 *  - contiene números que no aparecen en los datos originales (señal de invención).
 */
function validarRespuestaIA_(textoRespuesta, entrada) {
  let r;
  try {
    r = JSON.parse(String(textoRespuesta).replace(/^```(json)?|```$/g, '').trim());
  } catch (e) {
    return { ok: false, motivo: 'La respuesta no es JSON válido.', resultado: null };
  }
  const errores = [];
  if (typeof r.descripcion !== 'string' || !r.descripcion.trim()) errores.push('Falta descripcion.');
  if (typeof r.resumen !== 'string' || !r.resumen.trim()) errores.push('Falta resumen.');
  if (!Array.isArray(r.palabrasClave)) errores.push('palabrasClave debe ser una lista.');
  if (errores.length) return { ok: false, motivo: errores.join(' '), resultado: null };

  if (r.descripcion.length > IA_CONFIG.MAX_DESCRIPCION) errores.push('Descripción demasiado larga.');
  if (r.resumen.length > IA_CONFIG.MAX_RESUMEN) errores.push('Resumen demasiado largo.');

  // Se comparan números completos (no fragmentos): "24" no vale por aparecer dentro de "1024".
  const numeros = function (s) { return String(s).replace(/(\d),(\d)/g, '$1.$2').match(/\d+(\.\d+)?/g) || []; };
  const permitidos = new Set(numeros(JSON.stringify(entrada)));
  const salida = r.descripcion + ' ' + r.resumen + ' ' + r.palabrasClave.join(' ');
  const inventados = numeros(salida).filter(function (n) { return !permitidos.has(n); });
  if (inventados.length) errores.push('Contiene datos numéricos que no están en el original: ' + inventados.join(', '));

  if (errores.length) return { ok: false, motivo: errores.join(' '), resultado: null };
  return {
    ok: true,
    resultado: {
      descripcion: r.descripcion.trim(),
      resumen: r.resumen.trim(),
      palabrasClave: r.palabrasClave.map(String).map(function (s) { return s.trim(); }).filter(String).slice(0, IA_CONFIG.MAX_PALABRAS_CLAVE)
    }
  };
}
