/**
 * =============================================================================
 * Productos.gs — Lógica de productos y categorías
 * -----------------------------------------------------------------------------
 *   1. Lectura de PRODUCTOS (tabla de trabajo y objetos)
 *   2. Categorías
 *   3. Validación de datos de entrada
 *   4. Crear / actualizar / cambiar estado / eliminar
 *   5. Búsqueda y estadísticas
 *
 * Todas las escrituras pasan por conLock_() para evitar choques con
 * importaciones o triggers que corran al mismo tiempo.
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// 1. LECTURA
// -----------------------------------------------------------------------------

/**
 * Carga PRODUCTOS completo en memoria.
 * Devuelve { sh, map, ancho, filas, nOriginal, porCodigo(Map codigo->índice) }.
 * Si hay códigos duplicados, gana la primera fila (validarBase los reporta).
 */
function cargarTablaProductos_() {
  const sh = hoja_(SHEETS.PRODUCTOS);
  const map = mapaColumnas_(sh, HEADERS.PRODUCTOS);
  const ancho = sh.getLastColumn();
  const n = Math.max(sh.getLastRow() - 1, 0);
  const filas = n ? sh.getRange(2, 1, n, ancho).getValues() : [];
  const porCodigo = new Map();
  filas.forEach(function (f, i) {
    const c = normalizarCodigo_(f[map.CODIGO]);
    if (c && !porCodigo.has(c)) porCodigo.set(c, i);
  });
  return { sh: sh, map: map, ancho: ancho, filas: filas, nOriginal: n, porCodigo: porCodigo };
}

/** Convierte una fila cruda en objeto producto. `indice` es base 0 dentro de los datos. */
function filaAProducto_(fila, map, indice) {
  const precio = leerPrecio_(fila[map.PRECIO]);
  return {
    fila: indice + 2,
    id: texto_(fila[map.ID]),
    codigo: normalizarCodigo_(fila[map.CODIGO]),
    nombre: texto_(fila[map.NOMBRE]),
    categoria: texto_(fila[map.CATEGORIA]),
    subcategoria: texto_(fila[map.SUBCATEGORIA]),
    descripcion: texto_(fila[map.DESCRIPCION]),
    precio: precio.valor,
    precioValido: precio.valido,
    precioBruto: fila[map.PRECIO],
    moneda: texto_(fila[map.MONEDA]),
    imagenes: IMAGEN_SLOTS.map(function (s) { return texto_(fila[map[s]]); }),
    driveFolder: texto_(fila[map.DRIVE_FOLDER]),
    estado: texto_(fila[map.ESTADO]).toUpperCase(),
    destacado: aBooleano_(fila[map.DESTACADO]),
    fechaCreacion: fila[map.FECHA_CREACION],
    fechaActualizacion: fila[map.FECHA_ACTUALIZACION],
    observaciones: texto_(fila[map.OBSERVACIONES])
  };
}

/** Lista de productos (solo filas con código). */
function leerProductos_() {
  const t = cargarTablaProductos_();
  const lista = [];
  t.filas.forEach(function (f, i) {
    if (texto_(f[t.map.CODIGO])) lista.push(filaAProducto_(f, t.map, i));
  });
  return lista;
}

/** Siguiente ID numérico disponible. */
function siguienteId_(filas, map) {
  let max = 0;
  filas.forEach(function (f) {
    const n = Number(f[map.ID]);
    if (isFinite(n) && n > max) max = n;
  });
  return max + 1;
}

/** Un producto está incompleto si le falta algo necesario para publicarlo. */
function esIncompleto_(p) {
  return !p.nombre || !p.categoria || p.precio === null || !p.precioValido || !p.descripcion || !p.imagenes[0];
}

// -----------------------------------------------------------------------------
// 2. CATEGORÍAS
// -----------------------------------------------------------------------------

function cargarCategorias_() {
  const sh = hoja_(SHEETS.CATEGORIAS);
  const map = mapaColumnas_(sh, HEADERS.CATEGORIAS);
  const n = Math.max(sh.getLastRow() - 1, 0);
  const filas = n ? sh.getRange(2, 1, n, sh.getLastColumn()).getValues() : [];
  const lista = [];
  filas.forEach(function (f, i) {
    const nombre = texto_(f[map.NOMBRE]);
    if (!nombre) return;
    const activaBruta = f[map.ACTIVA];
    lista.push({
      fila: i + 2,
      id: texto_(f[map.ID]),
      nombre: nombre,
      slug: texto_(f[map.SLUG]) || slugify_(nombre),
      descripcion: texto_(f[map.DESCRIPCION]),
      // Una categoría sin valor en ACTIVA se considera activa.
      activa: activaBruta === '' || activaBruta === null ? true : aBooleano_(activaBruta),
      orden: Number(f[map.ORDEN]) || 9999
    });
  });
  lista.sort(function (a, b) { return a.orden - b.orden || a.nombre.localeCompare(b.nombre); });
  return { sh: sh, map: map, filas: filas, lista: lista };
}

/** Busca una categoría por nombre o slug (sin importar mayúsculas ni acentos). */
function buscarCategoria_(lista, valor) {
  const clave = claveBusqueda_(valor);
  const slug = slugify_(valor);
  for (let i = 0; i < lista.length; i++) {
    if (claveBusqueda_(lista[i].nombre) === clave || lista[i].slug === slug) return lista[i];
  }
  return null;
}

function crearCategoria_(nombre, descripcion) {
  const limpio = texto_(nombre);
  if (!limpio) throw new Error('La categoría necesita un nombre.');
  if (limpio.length > LIMITES.LARGO.CATEGORIA) throw new Error('El nombre de la categoría es demasiado largo.');
  return conLock_(function () {
    const c = cargarCategorias_();
    if (buscarCategoria_(c.lista, limpio)) throw new Error('La categoría "' + limpio + '" ya existe.');
    let maxId = 0, maxOrden = 0;
    c.filas.forEach(function (f) {
      maxId = Math.max(maxId, Number(f[c.map.ID]) || 0);
      maxOrden = Math.max(maxOrden, Number(f[c.map.ORDEN]) || 0);
    });
    const fila = new Array(c.sh.getLastColumn()).fill('');
    fila[c.map.ID] = maxId + 1;
    fila[c.map.NOMBRE] = celdaSegura_(limpio);
    fila[c.map.SLUG] = slugify_(limpio);
    fila[c.map.DESCRIPCION] = celdaSegura_(texto_(descripcion));
    fila[c.map.ACTIVA] = true;
    fila[c.map.ORDEN] = maxOrden + 1;
    const destino = c.sh.getLastRow() + 1;
    asegurarFilas_(c.sh, destino);
    c.sh.getRange(destino, 1, 1, fila.length).setValues([fila]);
    c.sh.getRange(destino, c.map.ACTIVA + 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    registrarLog_('CATEGORIA_CREADA', '', limpio, 'OK');
    invalidarCacheApi_();
    return { nombre: limpio, activa: true };
  });
}

// -----------------------------------------------------------------------------
// 3. VALIDACIÓN DE ENTRADA (todo lo que llega del panel pasa por aquí)
// -----------------------------------------------------------------------------

/**
 * Valida y normaliza los datos de un producto.
 * @param {Object} data      Datos enviados por el panel.
 * @param {Object|null} previo Producto existente (edición) o null (creación).
 * @param {Object} tabla     Resultado de cargarTablaProductos_().
 * @return {Object} producto normalizado. Lanza Error con todos los problemas juntos.
 */
function normalizarEntradaProducto_(data, previo, tabla) {
  if (!data || typeof data !== 'object') throw new Error('Datos de producto no válidos.');
  const errores = [];
  const L = LIMITES.LARGO;

  const codigo = previo ? previo.codigo : normalizarCodigo_(data.codigo);
  if (!previo) {
    if (!codigo) errores.push('El código es obligatorio.');
    else if (!esCodigoValido_(codigo)) errores.push('Código "' + codigo + '" no válido: usa letras, números, @, guion o punto (sin espacios ni "_"), entre 2 y 40 caracteres.');
    else if (tabla.porCodigo.has(codigo)) errores.push('Ya existe un producto con el código ' + codigo + '.');
  }

  const nombre = texto_(data.nombre);
  const subcategoria = texto_(data.subcategoria);
  const descripcion = texto_(data.descripcion);
  const observaciones = texto_(data.observaciones);
  const estado = texto_(data.estado).toUpperCase() || 'BORRADOR';
  const destacado = aBooleano_(data.destacado);

  if (nombre.length > L.NOMBRE) errores.push('El nombre supera ' + L.NOMBRE + ' caracteres.');
  if (subcategoria.length > L.SUBCATEGORIA) errores.push('La subcategoría supera ' + L.SUBCATEGORIA + ' caracteres.');
  if (descripcion.length > L.DESCRIPCION) errores.push('La descripción supera ' + L.DESCRIPCION + ' caracteres.');
  if (observaciones.length > L.OBSERVACIONES) errores.push('Las observaciones superan ' + L.OBSERVACIONES + ' caracteres.');
  if (ESTADOS.indexOf(estado) === -1) errores.push('Estado no válido: ' + estado + '.');

  // Categoría: si se indica, debe existir en CATEGORIAS.
  let categoria = texto_(data.categoria);
  if (categoria) {
    const cat = buscarCategoria_(cargarCategorias_().lista, categoria);
    if (!cat) errores.push('La categoría "' + categoria + '" no existe. Créala primero.');
    else categoria = cat.nombre;
  }

  // Precio: vacío permitido salvo para PUBLICADO.
  const precio = leerPrecio_(typeof data.precio === 'string' ? data.precio.trim() : data.precio);
  if (!precio.valido) errores.push('El precio debe ser un número mayor o igual a 0.');
  else if (precio.valor !== null && precio.valor > LIMITES.PRECIO_MAX) errores.push('El precio es demasiado alto.');

  // Imágenes: ID o link de Drive; se verifica que exista y sea imagen.
  const entradaImgs = Array.isArray(data.imagenes) ? data.imagenes : [];
  const imagenes = IMAGEN_SLOTS.map(function (slot, i) {
    const bruto = texto_(entradaImgs[i]);
    if (!bruto) return '';
    const id = extraerIdArchivo_(bruto);
    if (!id) { errores.push('Imagen ' + (i + 1) + ': link o ID de Drive no válido.'); return ''; }
    if (previo && previo.imagenes[i] === id) return id; // sin cambios, no hace falta verificar
    try {
      const f = DriveApp.getFileById(id);
      if (f.isTrashed()) errores.push('Imagen ' + (i + 1) + ': el archivo está en la papelera.');
      else if (!/^image\//.test(f.getMimeType())) errores.push('Imagen ' + (i + 1) + ': el archivo no es una imagen.');
    } catch (e) {
      errores.push('Imagen ' + (i + 1) + ': no existe o no tienes acceso.');
    }
    return id;
  });
  // La misma imagen no puede estar en dos productos ni repetida en el mismo.
  const vistas = {};
  imagenes.forEach(function (id, i) {
    if (!id) return;
    if (vistas[id]) errores.push('La imagen ' + (i + 1) + ' está repetida en este producto.');
    vistas[id] = true;
  });
  const usoPorOtro = mapaUsoImagenes_(tabla, codigo);
  imagenes.forEach(function (id, i) {
    if (id && usoPorOtro[id]) errores.push('La imagen ' + (i + 1) + ' ya pertenece al producto ' + usoPorOtro[id] + '.');
  });

  // Reglas para publicar.
  if (estado === 'PUBLICADO') {
    const faltan = [];
    if (!nombre) faltan.push('nombre');
    if (!categoria) faltan.push('categoría');
    if (precio.valor === null) faltan.push('precio');
    if (!descripcion) faltan.push('descripción');
    if (!imagenes[0]) faltan.push('imagen principal');
    if (faltan.length) errores.push('Para PUBLICAR falta: ' + faltan.join(', ') + '. Guárdalo como BORRADOR mientras tanto.');
  }
  if (!previo && !nombre) errores.push('El nombre es obligatorio.');

  if (errores.length) throw new Error(errores.join('\n'));

  return {
    codigo: codigo, nombre: nombre, categoria: categoria, subcategoria: subcategoria,
    descripcion: descripcion, precio: precio.valor, estado: estado, destacado: destacado,
    observaciones: observaciones, imagenes: imagenes
  };
}

/** { idImagen: codigoProducto } para todas las imágenes, excluyendo un código. */
function mapaUsoImagenes_(tabla, excluirCodigo) {
  const uso = {};
  tabla.filas.forEach(function (f) {
    const c = normalizarCodigo_(f[tabla.map.CODIGO]);
    if (!c || c === excluirCodigo) return;
    IMAGEN_SLOTS.forEach(function (s) {
      const id = texto_(f[tabla.map[s]]);
      if (id) uso[id] = c;
    });
  });
  return uso;
}

/** Escribe los valores normalizados sobre una fila (conserva columnas extra). */
function aplicarProductoAFila_(fila, p, map) {
  fila[map.CODIGO] = p.codigo;
  fila[map.NOMBRE] = celdaSegura_(p.nombre);
  fila[map.CATEGORIA] = celdaSegura_(p.categoria);
  fila[map.SUBCATEGORIA] = celdaSegura_(p.subcategoria);
  fila[map.DESCRIPCION] = celdaSegura_(p.descripcion);
  fila[map.PRECIO] = p.precio === null ? '' : p.precio;
  fila[map.ESTADO] = p.estado;
  fila[map.DESTACADO] = p.destacado;
  fila[map.OBSERVACIONES] = celdaSegura_(p.observaciones);
  IMAGEN_SLOTS.forEach(function (s, i) { fila[map[s]] = p.imagenes[i]; });
  fila[map.FECHA_ACTUALIZACION] = new Date();
  return fila;
}

// -----------------------------------------------------------------------------
// 4. CREAR / ACTUALIZAR / ESTADO / ELIMINAR
// -----------------------------------------------------------------------------

function crearProducto_(data) {
  return conLock_(function () {
    const t = cargarTablaProductos_();
    const p = normalizarEntradaProducto_(data, null, t);
    const fila = new Array(t.ancho).fill('');
    fila[t.map.ID] = siguienteId_(t.filas, t.map);
    fila[t.map.MONEDA] = getConfig_('MONEDA') || APP.MONEDA_DEFECTO;
    fila[t.map.FECHA_CREACION] = new Date();
    aplicarProductoAFila_(fila, p, t.map);
    const destino = Math.max(t.sh.getLastRow(), 1) + 1;
    asegurarFilas_(t.sh, destino);
    t.sh.getRange(destino, 1, 1, t.ancho).setValues([fila]);
    t.sh.getRange(destino, t.map.DESTACADO + 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    registrarLog_('PRODUCTO_CREADO', p.codigo, 'Creado desde el panel (' + p.estado + ')', 'OK');
    invalidarCacheApi_();
    return filaAProducto_(fila, t.map, destino - 2);
  });
}

/**
 * @param {Object=} opciones
 *   fechaEsperada: FECHA_ACTUALIZACION (ISO) que tenía quien edita. Si la fila
 *                  cambió desde entonces, se rechaza con codigo CONFLICTO en vez
 *                  de pisar el cambio de otra persona.
 *   autor:         quién edita (se guarda en LOGS).
 */
function actualizarProducto_(codigo, data, opciones) {
  opciones = opciones || {};
  return conLock_(function () {
    const t = cargarTablaProductos_();
    const c = normalizarCodigo_(codigo);
    const i = t.porCodigo.get(c);
    if (i === undefined) throw new Error('No existe el producto ' + c + '.');
    const previo = filaAProducto_(t.filas[i], t.map, i);
    if (opciones.fechaEsperada !== undefined) {
      const actual = previo.fechaActualizacion instanceof Date
        ? fechaIso_(previo.fechaActualizacion) : texto_(previo.fechaActualizacion);
      if (actual !== texto_(opciones.fechaEsperada)) {
        const conflicto = new Error('El producto ' + c + ' fue modificado por otra persona mientras lo editabas.');
        conflicto.codigo = 'CONFLICTO';
        throw conflicto;
      }
    }
    const p = normalizarEntradaProducto_(data, previo, t);
    const fila = aplicarProductoAFila_(t.filas[i].slice(), p, t.map);
    t.sh.getRange(i + 2, 1, 1, t.ancho).setValues([fila]);
    const cambios = describirCambios_(previo, filaAProducto_(fila, t.map, i));
    registrarLog_('PRODUCTO_ACTUALIZADO', c,
      (opciones.autor ? '[' + texto_(opciones.autor).slice(0, 254) + '] ' : '') + (cambios || 'Sin cambios'), 'OK');
    invalidarCacheApi_();
    return filaAProducto_(fila, t.map, i);
  });
}

/** Publicar / ocultar / etc. Reutiliza la validación completa. */
function cambiarEstadoProducto_(codigo, estado) {
  return actualizarCamposProducto_(codigo, { estado: estado });
}

/**
 * Cambia solo algunos campos ({ precio, estado }) conservando el resto de la
 * fila. Pasa por la validación completa (reglas para publicar, precio válido...).
 */
function actualizarCamposProducto_(codigo, cambios, opciones) {
  const t = cargarTablaProductos_();
  const i = t.porCodigo.get(normalizarCodigo_(codigo));
  if (i === undefined) throw new Error('No existe el producto ' + codigo + '.');
  const p = filaAProducto_(t.filas[i], t.map, i);
  const data = {
    nombre: p.nombre, categoria: p.categoria, subcategoria: p.subcategoria,
    descripcion: p.descripcion, precio: p.precio === null ? '' : p.precio,
    estado: p.estado, destacado: p.destacado, observaciones: p.observaciones, imagenes: p.imagenes
  };
  if (Object.prototype.hasOwnProperty.call(cambios, 'precio')) data.precio = cambios.precio;
  if (Object.prototype.hasOwnProperty.call(cambios, 'estado')) data.estado = cambios.estado;
  return actualizarProducto_(p.codigo, data, opciones);
}

/**
 * Elimina un producto. Exige que `confirmacion` sea exactamente el código
 * (protección contra borrados accidentales). Guarda una copia en LOGS.
 */
function eliminarProducto_(codigo, confirmacion) {
  const c = normalizarCodigo_(codigo);
  if (!c || normalizarCodigo_(confirmacion) !== c) {
    throw new Error('Confirmación incorrecta: escribe exactamente el código ' + c + ' para eliminar.');
  }
  return conLock_(function () {
    const t = cargarTablaProductos_();
    const i = t.porCodigo.get(c);
    if (i === undefined) throw new Error('No existe el producto ' + c + '.');
    const respaldo = {};
    Object.keys(t.map).forEach(function (h) {
      const v = t.filas[i][t.map[h]];
      respaldo[h] = v instanceof Date ? fechaIso_(v) : v;
    });
    t.sh.deleteRow(i + 2);
    registrarLog_('PRODUCTO_ELIMINADO', c, 'Respaldo: ' + JSON.stringify(respaldo), 'OK');
    invalidarCacheApi_();
    return { ok: true, codigo: c };
  });
}

function describirCambios_(a, b) {
  const campos = ['nombre', 'categoria', 'subcategoria', 'descripcion', 'precio', 'estado', 'destacado', 'observaciones'];
  const cambios = campos.filter(function (k) { return String(a[k]) !== String(b[k]); });
  if (a.imagenes.join('|') !== b.imagenes.join('|')) cambios.push('imagenes');
  return cambios.length ? 'Campos: ' + cambios.join(', ') : '';
}

// -----------------------------------------------------------------------------
// 5. BÚSQUEDA Y ESTADÍSTICAS
// -----------------------------------------------------------------------------

/** Busca por código (exacto o parcial) o por nombre (parcial, sin acentos). */
function buscarProductos_(textoBuscado) {
  const q = claveBusqueda_(textoBuscado);
  if (!q) return [];
  const codigoQ = normalizarCodigo_(textoBuscado);
  const lista = leerProductos_();
  const exactos = lista.filter(function (p) { return p.codigo === codigoQ; });
  if (exactos.length) return exactos;
  return lista.filter(function (p) {
    return claveBusqueda_(p.codigo).indexOf(q) !== -1 || claveBusqueda_(p.nombre).indexOf(q) !== -1;
  });
}

function calcularEstadisticas_(productos, categorias) {
  const s = {
    total: productos.length, publicados: 0, pendientes: 0, ocultos: 0, borradores: 0,
    categorias: categorias.filter(function (c) { return c.activa; }).length,
    sinImagen: 0, incompletos: 0
  };
  productos.forEach(function (p) {
    if (p.estado === 'PUBLICADO') s.publicados++;
    else if (p.estado === 'PENDIENTE') s.pendientes++;
    else if (p.estado === 'OCULTO') s.ocultos++;
    else if (p.estado === 'BORRADOR') s.borradores++;
    if (!p.imagenes[0]) s.sinImagen++;
    if (esIncompleto_(p)) s.incompletos++;
  });
  return s;
}

/** Versión liviana para la tabla del panel (sin Date: google.script.run no los transporta bien). */
function productoParaLista_(p) {
  return {
    codigo: p.codigo, nombre: p.nombre, categoria: p.categoria, subcategoria: p.subcategoria,
    precio: p.precio, estado: p.estado, destacado: p.destacado, imagen: p.imagenes[0],
    incompleto: esIncompleto_(p)
  };
}

/** Versión completa para el formulario del panel. */
function productoParaFormulario_(p) {
  return {
    codigo: p.codigo, nombre: p.nombre, categoria: p.categoria, subcategoria: p.subcategoria,
    descripcion: p.descripcion, precio: p.precio === null ? '' : p.precio, moneda: p.moneda,
    estado: p.estado, destacado: p.destacado, observaciones: p.observaciones,
    imagenes: p.imagenes.slice(),
    fechaCreacion: fechaTexto_(p.fechaCreacion), fechaActualizacion: fechaTexto_(p.fechaActualizacion)
  };
}
