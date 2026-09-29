/**
 * =============================================================================
 * AdminWeb.gs — Escrituras del panel web de Creer (Next.js)
 * -----------------------------------------------------------------------------
 * Todas estas acciones llegan por doPost (Api.gs) con el token de
 * administración (ADMIN_WRITE_TOKEN), distinto del token de lectura y
 * cotizaciones. El servidor web ya validó sesión, rol y datos; aquí se vuelve
 * a validar todo, porque Apps Script nunca confía en quien lo llama.
 *
 *   admin_guardar_producto    crear / editar producto completo
 *   admin_subir_imagen        guarda una imagen en la carpeta pública y la asocia
 *   admin_guardar_categoria   crear / editar categoría (renombre en cascada)
 *   admin_guardar_cliente     crear / editar cliente sin duplicar correos
 *   admin_actualizar_cotizacion  estado y notas internas
 *   admin_costos              lectura de costos internos
 *   admin_guardar_costo       costo interno de un producto
 *
 * Control de conflictos: cada fila viaja con una "versión". Productos usan
 * FECHA_ACTUALIZACION (ya existente); el resto usa un resumen (hash) de la fila.
 * Si la fila cambió desde que el panel la leyó, se rechaza con CONFLICTO.
 * =============================================================================
 */

const TIPOS_IMAGEN = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
});

/** Error con código para que el panel sepa qué mostrar. */
function errorAdmin_(codigo, mensaje) {
  const e = new Error(mensaje);
  e.codigo = codigo;
  return e;
}

function autorAdmin_(entrada) {
  return texto_(entrada && entrada.autor).slice(0, 254) || 'panel web';
}

/** Resumen estable de una fila (fechas en ISO) para detectar cambios de otra persona. */
function versionFila_(fila) {
  const normal = (fila || []).map(function (v) {
    return v instanceof Date ? fechaIso_(v) : v === null || v === undefined ? '' : String(v);
  });
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(normal), Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function exigirVersion_(fila, esperada, descripcion) {
  if (texto_(esperada) !== versionFila_(fila)) {
    throw errorAdmin_('CONFLICTO', descripcion + ' fue modificado por otra persona mientras lo editabas.');
  }
}

function indicePorId_(filas, indiceId, id) {
  const buscado = texto_(id);
  for (let i = 0; i < filas.length; i++) {
    if (texto_(filas[i][indiceId]) === buscado) return i;
  }
  return -1;
}

function textoLimitado_(valor, maximo, campo) {
  const s = texto_(valor);
  if (s.length > maximo) throw errorAdmin_('VALIDACION', campo + ' supera ' + maximo + ' caracteres.');
  return s;
}

// -----------------------------------------------------------------------------
// PRODUCTOS
// -----------------------------------------------------------------------------

/** Forma completa de un producto para el formulario del panel (sin IDs de carpeta). */
function productoAdminCompleto_(p) {
  const base = productoAdminWeb_(p);
  base.descripcion = p.descripcion;
  base.observaciones = p.observaciones;
  base.imagenes = p.imagenes.map(urlImagenPublica_);
  base.fechaCreacion = fechaAdminWeb_(p.fechaCreacion);
  return base;
}

/**
 * Traduce lo que envía el panel para cada imagen a un ID/link que entiende
 * normalizarEntradaProducto_. El navegador nunca maneja IDs de Drive:
 *   { tipo: 'mantener' } | { tipo: 'quitar' } | { tipo: 'drive', valor: link }
 */
function resolverImagenesPanel_(acciones, previas) {
  const lista = Array.isArray(acciones) ? acciones : [];
  return IMAGEN_SLOTS.map(function (slot, i) {
    const a = lista[i] && typeof lista[i] === 'object' ? lista[i] : { tipo: 'mantener' };
    const tipo = texto_(a.tipo);
    if (tipo === 'quitar') return '';
    if (tipo === 'drive') {
      const valor = texto_(a.valor).slice(0, 500);
      if (!extraerIdArchivo_(valor)) throw errorAdmin_('VALIDACION', 'Imagen ' + (i + 1) + ': link de Drive no válido.');
      return valor;
    }
    if (tipo && tipo !== 'mantener') throw errorAdmin_('VALIDACION', 'Imagen ' + (i + 1) + ': acción no válida.');
    return previas ? previas[i] : '';
  });
}

function guardarProductoAdminWeb_(entrada) {
  const modo = texto_(entrada.modo);
  if (modo !== 'crear' && modo !== 'editar') throw errorAdmin_('VALIDACION', 'Operación no válida.');
  const d = entrada.producto && typeof entrada.producto === 'object' ? entrada.producto : {};
  const autor = autorAdmin_(entrada);

  const datos = {
    codigo: d.codigo,
    nombre: texto_(d.nombre),
    categoria: texto_(d.categoria),
    subcategoria: texto_(d.subcategoria),
    descripcion: texto_(d.descripcion),
    precio: texto_(d.precio).slice(0, 30),
    estado: texto_(d.estado).toUpperCase(),
    destacado: d.destacado === true,
    observaciones: texto_(d.observaciones)
  };

  if (modo === 'crear') {
    datos.imagenes = resolverImagenesPanel_(d.imagenes, null);
    const creado = crearProducto_(datos);
    registrarLog_('PRODUCTO_CREADO_WEB', creado.codigo, '[' + autor + '] ' + creado.estado, 'OK');
    return { ok: true, producto: productoAdminCompleto_(creado) };
  }

  const codigo = normalizarCodigo_(d.codigo);
  const t = cargarTablaProductos_();
  const i = t.porCodigo.get(codigo);
  if (i === undefined) throw errorAdmin_('NO_ENCONTRADO', 'No existe el producto ' + codigo + '.');
  const previo = filaAProducto_(t.filas[i], t.map, i);
  datos.imagenes = resolverImagenesPanel_(d.imagenes, previo.imagenes);
  const actualizado = actualizarProducto_(codigo, datos, {
    fechaEsperada: texto_(entrada.fechaActualizacion),
    autor: autor
  });
  return { ok: true, producto: productoAdminCompleto_(actualizado) };
}

/** Comprueba la "firma" de los primeros bytes: el tipo declarado no basta. */
function firmaImagenValida_(bytes, mime) {
  const b = function (i) { return bytes[i] & 0xff; };
  if (bytes.length < 12) return false;
  if (mime === 'image/jpeg') return b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff;
  if (mime === 'image/png') return b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47;
  if (mime === 'image/webp') {
    return b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 &&
      b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50;
  }
  return false;
}

/**
 * Guarda una imagen en la carpeta pública y la pone en el espacio indicado del
 * producto. El nombre sigue la convención del importador (CODIGO.jpg,
 * CODIGO_1.jpg, CODIGO_2.jpg), así una importación futura la reconoce y no la
 * duplica. Si la asociación falla, el archivo nuevo va a la papelera
 * (recuperable) para que la carpeta pública no acumule imágenes sueltas.
 */
function subirImagenAdminWeb_(entrada) {
  const codigo = normalizarCodigo_(entrada.codigo);
  if (!esCodigoValido_(codigo)) throw errorAdmin_('VALIDACION', 'Código de producto no válido.');
  const slot = Number(entrada.espacio);
  if (!Number.isInteger(slot) || slot < 0 || slot >= IMAGEN_SLOTS.length) {
    throw errorAdmin_('VALIDACION', 'Espacio de imagen no válido.');
  }
  const mime = texto_(entrada.tipo).toLowerCase();
  const extension = TIPOS_IMAGEN[mime];
  if (!extension) throw errorAdmin_('VALIDACION', 'Solo se aceptan imágenes JPG, PNG o WEBP.');

  let bytes;
  try {
    bytes = Utilities.base64Decode(texto_(entrada.contenido));
  } catch (e) {
    throw errorAdmin_('VALIDACION', 'El archivo no llegó completo.');
  }
  if (!bytes.length) throw errorAdmin_('VALIDACION', 'El archivo está vacío.');
  if (bytes.length > LIMITES.IMAGEN_MAX_BYTES) throw errorAdmin_('VALIDACION', 'La imagen supera 3 MB.');
  if (!firmaImagenValida_(bytes, mime)) throw errorAdmin_('VALIDACION', 'El archivo no es una imagen válida.');

  const carpetaId = extraerIdCarpeta_(getConfig_('DRIVE_UPLOAD_ID') || getConfig_('DRIVE_PRINCIPAL_ID'));
  if (!carpetaId) throw errorAdmin_('NO_CONFIGURADO_DRIVE', 'Falta la carpeta de imágenes (DRIVE_UPLOAD_ID o DRIVE_PRINCIPAL_ID).');

  // El producto debe existir antes de crear nada en Drive.
  const t = cargarTablaProductos_();
  if (t.porCodigo.get(codigo) === undefined) throw errorAdmin_('NO_ENCONTRADO', 'No existe el producto ' + codigo + '.');

  const nombre = codigo + (slot === 0 ? '' : '_' + slot) + '.' + extension;
  const archivo = DriveApp.getFolderById(carpetaId).createFile(Utilities.newBlob(bytes, mime, nombre));
  try {
    // La web pública solo muestra imágenes compartidas con enlace.
    try {
      if (archivo.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK) {
        archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
    } catch (e) { /* si la cuenta no permite compartir, la imagen se ve solo en el panel */ }

    const accion = [{ tipo: 'mantener' }, { tipo: 'mantener' }, { tipo: 'mantener' }];
    accion[slot] = { tipo: 'drive', valor: archivo.getId() };
    return guardarProductoDesdeImagen_(codigo, accion, entrada, nombre);
  } catch (err) {
    try { archivo.setTrashed(true); } catch (e) { /* no bloquear el mensaje original */ }
    throw err;
  }
}

function guardarProductoDesdeImagen_(codigo, acciones, entrada, nombreArchivo) {
  const t = cargarTablaProductos_();
  const i = t.porCodigo.get(codigo);
  const p = filaAProducto_(t.filas[i], t.map, i);
  const resultado = guardarProductoAdminWeb_({
    modo: 'editar',
    autor: entrada.autor,
    fechaActualizacion: entrada.fechaActualizacion,
    producto: {
      codigo: p.codigo, nombre: p.nombre, categoria: p.categoria, subcategoria: p.subcategoria,
      descripcion: p.descripcion, precio: p.precio === null ? '' : String(p.precio), estado: p.estado,
      destacado: p.destacado, observaciones: p.observaciones, imagenes: acciones
    }
  });
  registrarLog_('IMAGEN_SUBIDA_WEB', codigo, '[' + autorAdmin_(entrada) + '] ' + nombreArchivo, 'OK');
  return resultado;
}

// -----------------------------------------------------------------------------
// CATEGORÍAS
// -----------------------------------------------------------------------------

function categoriaAdminWeb_(fila, map, productosPorCategoria) {
  const activa = fila[map.ACTIVA];
  const nombre = texto_(fila[map.NOMBRE]);
  return {
    id: texto_(fila[map.ID]),
    nombre: nombre,
    slug: texto_(fila[map.SLUG]) || slugify_(nombre),
    descripcion: texto_(fila[map.DESCRIPCION]),
    activa: activa === '' || activa === null ? true : aBooleano_(activa),
    orden: Number(fila[map.ORDEN]) || 9999,
    productos: productosPorCategoria ? productosPorCategoria[claveBusqueda_(nombre)] || 0 : 0,
    version: versionFila_(fila)
  };
}

function guardarCategoriaAdminWeb_(entrada) {
  const d = entrada.categoria && typeof entrada.categoria === 'object' ? entrada.categoria : {};
  const autor = autorAdmin_(entrada);
  const nombre = textoLimitado_(d.nombre, LIMITES.LARGO.CATEGORIA, 'El nombre');
  if (!nombre) throw errorAdmin_('VALIDACION', 'La categoría necesita un nombre.');
  const descripcion = textoLimitado_(d.descripcion, 500, 'La descripción');
  const orden = Number(d.orden);
  if (!Number.isInteger(orden) || orden < 0 || orden > 9999) throw errorAdmin_('VALIDACION', 'El orden debe ser un número entre 0 y 9999.');
  const activa = d.activa === true;
  const id = texto_(d.id);

  return conLock_(function () {
    const c = cargarCategorias_();
    const otra = buscarCategoria_(c.lista, nombre);

    if (!id) {
      if (otra) throw errorAdmin_('VALIDACION', 'La categoría "' + otra.nombre + '" ya existe.');
      let maxId = 0;
      c.filas.forEach(function (f) { maxId = Math.max(maxId, Number(f[c.map.ID]) || 0); });
      const fila = new Array(c.sh.getLastColumn()).fill('');
      fila[c.map.ID] = maxId + 1;
      fila[c.map.NOMBRE] = celdaSegura_(nombre);
      fila[c.map.SLUG] = slugify_(nombre);
      fila[c.map.DESCRIPCION] = celdaSegura_(descripcion);
      fila[c.map.ACTIVA] = activa;
      fila[c.map.ORDEN] = orden;
      const destino = Math.max(c.sh.getLastRow(), 1) + 1;
      asegurarFilas_(c.sh, destino);
      c.sh.getRange(destino, 1, 1, fila.length).setValues([fila]);
      c.sh.getRange(destino, c.map.ACTIVA + 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
      registrarLog_('CATEGORIA_CREADA_WEB', '', '[' + autor + '] ' + nombre, 'OK');
      invalidarCacheApi_();
      return { ok: true, categoria: categoriaAdminWeb_(fila, c.map, null) };
    }

    const idx = indicePorId_(c.filas, c.map.ID, id);
    if (idx === -1) throw errorAdmin_('NO_ENCONTRADO', 'La categoría ya no existe.');
    const fila = c.filas[idx].slice();
    exigirVersion_(fila, entrada.version, 'La categoría');
    const anterior = texto_(fila[c.map.NOMBRE]);
    if (otra && claveBusqueda_(otra.nombre) !== claveBusqueda_(anterior)) {
      throw errorAdmin_('VALIDACION', 'Ya existe otra categoría llamada "' + otra.nombre + '".');
    }
    fila[c.map.NOMBRE] = celdaSegura_(nombre);
    if (!texto_(fila[c.map.SLUG])) fila[c.map.SLUG] = slugify_(nombre); // el slug no cambia: los enlaces siguen válidos
    fila[c.map.DESCRIPCION] = celdaSegura_(descripcion);
    fila[c.map.ACTIVA] = activa;
    fila[c.map.ORDEN] = orden;
    c.sh.getRange(idx + 2, 1, 1, fila.length).setValues([fila]);

    // Renombre: los productos guardan el NOMBRE de la categoría, se actualizan en el mismo bloqueo.
    let movidos = 0;
    if (anterior !== nombre) {
      const t = cargarTablaProductos_();
      if (t.filas.length) {
        const col = t.map.CATEGORIA;
        const colFecha = t.map.FECHA_ACTUALIZACION;
        const ahora = new Date();
        const categorias = [];
        const fechas = [];
        t.filas.forEach(function (f) {
          const mover = claveBusqueda_(f[col]) === claveBusqueda_(anterior);
          if (mover) movidos++;
          categorias.push([mover ? celdaSegura_(nombre) : f[col]]);
          // La fecha cambia para que un formulario abierto con la categoría vieja detecte el conflicto.
          fechas.push([mover ? ahora : f[colFecha]]);
        });
        if (movidos) {
          t.sh.getRange(2, col + 1, categorias.length, 1).setValues(categorias);
          t.sh.getRange(2, colFecha + 1, fechas.length, 1).setValues(fechas);
        }
      }
    }
    registrarLog_('CATEGORIA_ACTUALIZADA_WEB', '',
      '[' + autor + '] ' + anterior + (anterior !== nombre ? ' -> ' + nombre + ' (' + movidos + ' productos)' : ''), 'OK');
    invalidarCacheApi_();
    return { ok: true, categoria: categoriaAdminWeb_(fila, c.map, null), productosActualizados: movidos };
  });
}

// -----------------------------------------------------------------------------
// CLIENTES
// -----------------------------------------------------------------------------

function normalizarClienteAdmin_(d) {
  const email = texto_(d.email).toLowerCase();
  if (!email) throw errorAdmin_('VALIDACION', 'El correo es obligatorio.');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw errorAdmin_('VALIDACION', 'El correo no es válido.');
  const cliente = {
    nombre: textoLimitado_(d.nombre, 150, 'El nombre'),
    empresa: textoLimitado_(d.empresa, 150, 'La empresa'),
    email: email,
    telefono: textoLimitado_(d.telefono, 60, 'El teléfono')
  };
  if (!cliente.nombre && !cliente.empresa) throw errorAdmin_('VALIDACION', 'Indica el nombre o la empresa.');
  return cliente;
}

function guardarClienteAdminWeb_(entrada) {
  const d = entrada.cliente && typeof entrada.cliente === 'object' ? entrada.cliente : {};
  const cliente = normalizarClienteAdmin_(d);
  const id = texto_(d.id);
  const autor = autorAdmin_(entrada);

  return conLock_(function () {
    const sh = hoja_(SHEETS.CLIENTES);
    const map = mapaColumnas_(sh, HEADERS.CLIENTES);
    const tabla = filasTabla_(sh, map);
    const ahora = new Date();
    // Un correo = un cliente. Se compara sin mayúsculas ni espacios.
    const duplicado = tabla.filas.findIndex(function (f) {
      return texto_(f[map.EMAIL]).toLowerCase() === cliente.email && texto_(f[map.ID]) !== id;
    });
    if (duplicado !== -1) {
      throw errorAdmin_('DUPLICADO', 'Ya existe un cliente con ese correo (ID ' + texto_(tabla.filas[duplicado][map.ID]) + ').');
    }

    let fila, destino;
    if (!id) {
      fila = new Array(tabla.ancho).fill('');
      fila[map.ID] = siguienteIdTabla_(tabla.filas, map.ID);
      fila[map.FECHA_CREACION] = ahora;
      destino = Math.max(sh.getLastRow(), 1) + 1;
    } else {
      const idx = indicePorId_(tabla.filas, map.ID, id);
      if (idx === -1) throw errorAdmin_('NO_ENCONTRADO', 'El cliente ya no existe.');
      fila = tabla.filas[idx].slice();
      exigirVersion_(fila, entrada.version, 'El cliente');
      destino = idx + 2;
    }
    fila[map.NOMBRE] = celdaSegura_(cliente.nombre);
    fila[map.EMPRESA] = celdaSegura_(cliente.empresa);
    fila[map.EMAIL] = celdaSegura_(cliente.email);
    fila[map.TELEFONO] = celdaSegura_(cliente.telefono);
    fila[map.FECHA_ACTUALIZACION] = ahora;
    escribirFilasTexto_(sh, destino, [fila], [map.TELEFONO]);
    registrarLog_(id ? 'CLIENTE_ACTUALIZADO_WEB' : 'CLIENTE_CREADO_WEB', '', '[' + autor + '] ' + cliente.email, 'OK');
    return { ok: true, cliente: { id: texto_(fila[map.ID]), version: versionFila_(fila) } };
  });
}

// -----------------------------------------------------------------------------
// COTIZACIONES
// -----------------------------------------------------------------------------

function actualizarCotizacionAdminWeb_(entrada) {
  const id = texto_(entrada.id);
  const estado = texto_(entrada.estado).toUpperCase();
  if (!id) throw errorAdmin_('VALIDACION', 'Falta la cotización.');
  if (ESTADOS_COTIZACION.indexOf(estado) === -1) throw errorAdmin_('VALIDACION', 'Estado de cotización no válido.');
  const notas = textoLimitado_(entrada.notasInternas, 2000, 'Las notas internas');
  const autor = autorAdmin_(entrada);

  return conLock_(function () {
    const sh = hoja_(SHEETS.COTIZACIONES);
    const map = mapaColumnas_(sh, COTIZACIONES_REQUERIDAS.concat(['NOTAS_INTERNAS', 'FECHA_ACTUALIZACION']));
    const tabla = filasTabla_(sh, map);
    const idx = indicePorId_(tabla.filas, map.ID, id);
    if (idx === -1) throw errorAdmin_('NO_ENCONTRADO', 'La cotización ya no existe.');
    const fila = tabla.filas[idx].slice();
    exigirVersion_(fila, entrada.version, 'La cotización');
    const anterior = texto_(fila[map.ESTADO]).toUpperCase();
    fila[map.ESTADO] = estado;
    fila[map.NOTAS_INTERNAS] = celdaSegura_(notas);
    fila[map.FECHA_ACTUALIZACION] = new Date();
    // Solo se escriben las columnas editables; el resto de la fila queda igual.
    [map.ESTADO, map.NOTAS_INTERNAS, map.FECHA_ACTUALIZACION].forEach(function (c) {
      sh.getRange(idx + 2, c + 1).setValue(fila[c]);
    });
    registrarLog_('COTIZACION_ACTUALIZADA_WEB', texto_(fila[map.REFERENCIA]),
      '[' + autor + '] ' + anterior + ' -> ' + estado, 'OK');
    return { ok: true, cotizacion: { id: id, estado: estado, version: versionFila_(fila) } };
  });
}

// -----------------------------------------------------------------------------
// COSTOS (privados)
// -----------------------------------------------------------------------------

function tablaCostos_() {
  const sh = hoja_(SHEETS.COSTOS);
  const map = mapaColumnas_(sh, HEADERS.COSTOS);
  const tabla = filasTabla_(sh, map);
  const porCodigo = {};
  tabla.filas.forEach(function (f, i) {
    const c = normalizarCodigo_(f[map.CODIGO]);
    if (c && porCodigo[c] === undefined) porCodigo[c] = i;
  });
  tabla.sh = sh;
  tabla.porCodigo = porCodigo;
  return tabla;
}

function costoAdminWeb_(fila, map) {
  const costo = leerPrecio_(fila[map.COSTO]);
  return {
    codigo: normalizarCodigo_(fila[map.CODIGO]),
    costo: costo.valido ? costo.valor : null,
    moneda: texto_(fila[map.MONEDA]) || APP.MONEDA_DEFECTO,
    proveedor: texto_(fila[map.PROVEEDOR]),
    notas: texto_(fila[map.NOTAS]),
    fechaActualizacion: fechaAdminWeb_(fila[map.FECHA_ACTUALIZACION]),
    version: versionFila_(fila)
  };
}

function getCostosAdminWeb_() {
  const t = tablaCostos_();
  return t.filas
    .filter(function (f) { return normalizarCodigo_(f[t.map.CODIGO]); })
    .map(function (f) { return costoAdminWeb_(f, t.map); });
}

function guardarCostoAdminWeb_(entrada) {
  const codigo = normalizarCodigo_(entrada.codigo);
  if (!esCodigoValido_(codigo)) throw errorAdmin_('VALIDACION', 'Código de producto no válido.');
  const costo = leerPrecio_(texto_(entrada.costo).slice(0, 30));
  if (!costo.valido) throw errorAdmin_('VALIDACION', 'El costo debe ser un número mayor o igual a 0.');
  if (costo.valor !== null && costo.valor > LIMITES.PRECIO_MAX) throw errorAdmin_('VALIDACION', 'El costo es demasiado alto.');
  const proveedor = textoLimitado_(entrada.proveedor, 120, 'El proveedor');
  const notas = textoLimitado_(entrada.notas, LIMITES.LARGO.OBSERVACIONES, 'Las notas');
  const autor = autorAdmin_(entrada);

  return conLock_(function () {
    if (cargarTablaProductos_().porCodigo.get(codigo) === undefined) {
      throw errorAdmin_('NO_ENCONTRADO', 'No existe el producto ' + codigo + '.');
    }
    const t = tablaCostos_();
    const idx = t.porCodigo[codigo];
    let fila, destino;
    if (idx === undefined) {
      if (texto_(entrada.version)) throw errorAdmin_('CONFLICTO', 'El costo fue modificado por otra persona mientras lo editabas.');
      fila = new Array(t.ancho).fill('');
      fila[t.map.CODIGO] = codigo;
      destino = Math.max(t.sh.getLastRow(), 1) + 1;
    } else {
      fila = t.filas[idx].slice();
      exigirVersion_(fila, entrada.version, 'El costo');
      destino = idx + 2;
    }
    fila[t.map.COSTO] = costo.valor === null ? '' : costo.valor;
    fila[t.map.MONEDA] = getConfig_('MONEDA') || APP.MONEDA_DEFECTO;
    fila[t.map.PROVEEDOR] = celdaSegura_(proveedor);
    fila[t.map.NOTAS] = celdaSegura_(notas);
    fila[t.map.FECHA_ACTUALIZACION] = new Date();
    escribirFilasTexto_(t.sh, destino, [fila], [t.map.CODIGO]);
    // El valor del costo no se escribe en LOGS: la hoja de logs es más visible.
    registrarLog_('COSTO_ACTUALIZADO_WEB', codigo, '[' + autor + ']', 'OK');
    return { ok: true, costo: costoAdminWeb_(fila, t.map) };
  });
}

// -----------------------------------------------------------------------------
// ENRUTADOR (lo usa doPost)
// -----------------------------------------------------------------------------

const ACCIONES_ADMIN = Object.freeze({
  admin_actualizar_producto: function (e) { return actualizarProductoAdminWeb_(e); },
  admin_guardar_producto: guardarProductoAdminWeb_,
  admin_subir_imagen: subirImagenAdminWeb_,
  admin_guardar_categoria: guardarCategoriaAdminWeb_,
  admin_guardar_cliente: guardarClienteAdminWeb_,
  admin_actualizar_cotizacion: actualizarCotizacionAdminWeb_,
  admin_costos: function () { return { ok: true, costos: getCostosAdminWeb_() }; },
  admin_guardar_costo: guardarCostoAdminWeb_
});

function esAccionAdmin_(accion) {
  return Object.prototype.hasOwnProperty.call(ACCIONES_ADMIN, accion);
}

function ejecutarAccionAdmin_(accion, entrada) {
  return ACCIONES_ADMIN[accion](entrada);
}
