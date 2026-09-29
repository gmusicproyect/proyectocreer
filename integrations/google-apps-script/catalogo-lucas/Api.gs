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
  try {
    CacheService.getScriptCache().removeAll([CACHE_API_CLAVE, CACHE_API_CLAVE + '_PRESENTACION']);
  } catch (e) { /* sin caché no pasa nada */ }
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
 * Catálogo para la web (Next.js). Lo pide el SERVIDOR de la web con el token
 * privado, así la planilla puede quedar privada: nadie necesita leerla por CSV.
 *   modo 'published'    -> igual que getProductosPublicados()
 *   modo 'presentation' -> también PENDIENTE completos (laboratorio), precio puede ir vacío
 * Nunca incluye costos, observaciones, carpeta, fechas ni ID interno.
 */
function getProductosCatalogoWeb_(modo) {
  if (modo !== 'presentation') {
    return getProductosPublicados().map(function (p) { return Object.assign({ estado: 'PUBLICADO' }, p); });
  }
  const cache = CacheService.getScriptCache();
  const clave = CACHE_API_CLAVE + '_PRESENTACION';
  const enCache = cache.get(clave);
  if (enCache) return JSON.parse(enCache);

  const lista = leerProductos_()
    .filter(function (p) {
      return (p.estado === 'PUBLICADO' || p.estado === 'PENDIENTE') &&
        p.nombre && p.categoria && p.descripcion && p.imagenes[0];
    })
    .map(function (p) {
      const publico = productoPublico_(p);
      publico.estado = p.estado;
      if (!p.precioValido) publico.precio = null;
      return publico;
    });
  const json = JSON.stringify(lista);
  if (json.length < 95000) cache.put(clave, json, LIMITES.CACHE_API_SEG);
  return lista;
}

/**
 * Vista privada para el panel web de Lucas. Solo se entrega después de validar
 * el token del servidor. No se cachea porque clientes y cotizaciones deben
 * aparecer inmediatamente en la administración.
 */
function getDatosAdminWeb_() {
  const productos = leerProductos_();
  const categorias = cargarCategorias_().lista;
  const clientesTabla = filasTabla_(
    hoja_(SHEETS.CLIENTES),
    mapaColumnas_(hoja_(SHEETS.CLIENTES), HEADERS.CLIENTES)
  );
  const cotizacionesSh = hoja_(SHEETS.COTIZACIONES);
  const cotizacionesTabla = filasTabla_(
    cotizacionesSh,
    mapaColumnas_(cotizacionesSh, COTIZACIONES_REQUERIDAS)
  );
  const itemsSh = hoja_(SHEETS.COTIZACION_ITEMS);
  const itemsTabla = filasTabla_(
    itemsSh,
    mapaColumnas_(itemsSh, HEADERS.COTIZACION_ITEMS)
  );

  const clientes = clientesTabla.filas.map(function (fila) {
    return {
      id: texto_(fila[clientesTabla.map.ID]),
      nombre: texto_(fila[clientesTabla.map.NOMBRE]),
      empresa: texto_(fila[clientesTabla.map.EMPRESA]),
      email: texto_(fila[clientesTabla.map.EMAIL]),
      telefono: texto_(fila[clientesTabla.map.TELEFONO]),
      fechaCreacion: fechaAdminWeb_(fila[clientesTabla.map.FECHA_CREACION]),
      fechaActualizacion: fechaAdminWeb_(fila[clientesTabla.map.FECHA_ACTUALIZACION])
    };
  }).filter(function (cliente) { return cliente.id || cliente.email; });

  const clientesPorId = {};
  clientes.forEach(function (cliente) { clientesPorId[cliente.id] = cliente; });

  const itemsPorCotizacion = {};
  itemsTabla.filas.forEach(function (fila) {
    const cotizacionId = texto_(fila[itemsTabla.map.COTIZACION_ID]);
    if (!cotizacionId) return;
    if (!itemsPorCotizacion[cotizacionId]) itemsPorCotizacion[cotizacionId] = [];
    const precio = leerPrecio_(fila[itemsTabla.map.PRECIO_REFERENCIA]);
    itemsPorCotizacion[cotizacionId].push({
      codigo: normalizarCodigo_(fila[itemsTabla.map.CODIGO]),
      nombre: texto_(fila[itemsTabla.map.NOMBRE]),
      cantidad: Number(fila[itemsTabla.map.CANTIDAD]) || 0,
      acabamento: texto_(fila[itemsTabla.map.ACABAMENTO]),
      personalizacion: texto_(fila[itemsTabla.map.PERSONALIZACION]),
      precioReferencia: precio.valido ? precio.valor : null,
      moneda: texto_(fila[itemsTabla.map.MONEDA]) || APP.MONEDA_DEFECTO
    });
  });

  const cotizaciones = cotizacionesTabla.filas.map(function (fila) {
    const map = cotizacionesTabla.map;
    const id = texto_(fila[map.ID]);
    const cliente = clientesPorId[texto_(fila[map.CLIENTE_ID])] || {};
    return {
      id: id,
      referencia: texto_(fila[map.REFERENCIA]),
      estado: texto_(fila[map.ESTADO]).toUpperCase(),
      notas: texto_(fila[map.NOTAS]),
      fechaCreacion: fechaAdminWeb_(fila[map.FECHA_CREACION]),
      contacto: {
        nombre: valorColumnaAdmin_(fila, map, 'CONTACTO_NOMBRE') || cliente.nombre || '',
        empresa: valorColumnaAdmin_(fila, map, 'CONTACTO_EMPRESA') || cliente.empresa || '',
        email: valorColumnaAdmin_(fila, map, 'CONTACTO_EMAIL') || cliente.email || '',
        telefono: valorColumnaAdmin_(fila, map, 'CONTACTO_TELEFONO') || cliente.telefono || ''
      },
      items: itemsPorCotizacion[id] || []
    };
  }).filter(function (cotizacion) { return cotizacion.id || cotizacion.referencia; })
    .sort(function (a, b) { return b.fechaCreacion.localeCompare(a.fechaCreacion); });

  return {
    generado: new Date().toISOString(),
    productos: productos.map(function (p) {
      return {
        codigo: p.codigo,
        nombre: p.nombre,
        categoria: p.categoria,
        subcategoria: p.subcategoria,
        precio: p.precioValido ? p.precio : null,
        moneda: p.moneda || APP.MONEDA_DEFECTO,
        estado: p.estado,
        destacado: p.destacado,
        incompleto: esIncompleto_(p),
        imagen: urlImagenPublica_(p.imagenes[0]),
        fechaActualizacion: fechaAdminWeb_(p.fechaActualizacion)
      };
    }),
    categorias: categorias.map(function (c) {
      return {
        id: c.id,
        nombre: c.nombre,
        slug: c.slug,
        descripcion: c.descripcion,
        activa: c.activa,
        orden: c.orden
      };
    }),
    clientes: clientes,
    cotizaciones: cotizaciones,
    stats: calcularEstadisticas_(productos, categorias)
  };
}

function fechaAdminWeb_(valor) {
  return valor instanceof Date && !isNaN(valor.getTime()) ? valor.toISOString() : texto_(valor);
}

function valorColumnaAdmin_(fila, map, nombre) {
  return map[nombre] === undefined ? '' : texto_(fila[map[nombre]]);
}

/** Comprueba el token privado (Propiedades del script → QUOTE_API_TOKEN). */
function verificarTokenWeb_(recibido) {
  const esperado = PropertiesService.getScriptProperties().getProperty('QUOTE_API_TOKEN');
  if (!esperado) throw new Error('La conexión con la web no está configurada (falta QUOTE_API_TOKEN).');
  if (!recibido || texto_(recibido) !== esperado) throw new Error('Solicitud no autorizada.');
}

/**
 * Punto de entrada privado para el servidor de la web. Requiere apiToken.
 *   { accion: 'catalogo', modo: 'presentation'|'published' } -> productos
 *   { accion: 'cotizacion', ...solicitud }                     -> registra cotización
 *   { accion: 'admin_datos' }                                  -> datos privados del panel
 * Sin "accion" se asume 'cotizacion' (compatibilidad con la versión anterior).
 */
function doPost(e) {
  let cuerpo;
  let accion = 'cotizacion';
  try {
    const entrada = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    accion = texto_(entrada.accion) || 'cotizacion';
    verificarTokenWeb_(entrada.apiToken);
    delete entrada.apiToken;
    delete entrada.accion;
    if (accion === 'catalogo') {
      const productos = getProductosCatalogoWeb_(texto_(entrada.modo));
      cuerpo = { ok: true, total: productos.length, productos: productos };
    } else if (accion === 'cotizacion') {
      cuerpo = registrarSolicitudWeb_(entrada);
    } else if (accion === 'admin_datos') {
      cuerpo = { ok: true, datos: getDatosAdminWeb_() };
    } else {
      throw new Error('Acción no válida: ' + accion);
    }
  } catch (err) {
    const esLectura = accion === 'catalogo' || accion === 'admin_datos';
    registrarLog_(accion === 'catalogo' ? 'CATALOGO_WEB_ERROR' : accion === 'admin_datos' ? 'ADMIN_WEB_ERROR' : 'COTIZACION_WEB_ERROR', '', err.message, 'ERROR');
    cuerpo = { ok: false, error: esLectura ? 'No se pudieron leer los datos.' : 'No se pudo registrar la solicitud.' };
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
