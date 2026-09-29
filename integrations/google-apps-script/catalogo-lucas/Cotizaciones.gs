/**
 * Recibe una solicitud pública ya validada por la web y la guarda en tres
 * tablas: CLIENTES, COTIZACIONES y COTIZACION_ITEMS.
 */

function normalizarSolicitudWeb_(entrada) {
  entrada = entrada || {};
  const claveSolicitud = texto_(entrada.requestKey).slice(0, 100);
  const cliente = entrada.customer || {};
  const nombre = texto_(cliente.name).slice(0, 150);
  const empresa = texto_(cliente.company).slice(0, 150);
  const email = texto_(cliente.email).toLowerCase().slice(0, 254);
  const telefono = texto_(cliente.phone).slice(0, 60);
  const notas = texto_(entrada.notes).slice(0, 1000);
  const items = Array.isArray(entrada.items) ? entrada.items : [];

  if (!/^[A-Za-z0-9-]{16,100}$/.test(claveSolicitud)) {
    throw new Error('Falta una clave de solicitud válida.');
  }
  if (!nombre || !empresa || !email || !telefono) {
    throw new Error('Faltan los datos obligatorios del cliente.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('El correo no es válido.');
  }
  if (!items.length || items.length > 50) {
    throw new Error('La solicitud debe tener entre 1 y 50 productos.');
  }

  const productos = items.map(function (item) {
    const codigo = normalizarCodigo_(item && item.code);
    const cantidad = Number(item && item.quantity);
    if (!esCodigoValido_(codigo)) throw new Error('Hay un código de producto inválido.');
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 9999) {
      throw new Error('Hay una cantidad inválida.');
    }
    return {
      codigo: codigo,
      nombre: texto_(item.name).slice(0, 150),
      cantidad: cantidad,
      acabamento: texto_(item.color).slice(0, 100),
      personalizacion: texto_(item.personalization).slice(0, 500)
    };
  });

  return {
    requestKey: claveSolicitud,
    customer: {
      name: nombre,
      company: empresa,
      email: email,
      phone: telefono
    },
    notes: notas,
    items: productos
  };
}

function siguienteIdTabla_(filas, indiceId) {
  return filas.reduce(function (max, fila) {
    const id = Number(fila[indiceId]);
    return Number.isFinite(id) ? Math.max(max, id) : max;
  }, 0) + 1;
}

function filasTabla_(sh, map) {
  const ancho = sh.getLastColumn();
  const total = Math.max(sh.getLastRow() - 1, 0);
  return {
    ancho: ancho,
    filas: total ? sh.getRange(2, 1, total, ancho).getValues() : [],
    map: map
  };
}

/**
 * Escribe filas a partir de `desdeFila`, agrandando la hoja si hace falta.
 * Las columnas indicadas (índices base 0) se fuerzan a texto ANTES de escribir,
 * para que "00001" o "0800..." no pierdan los ceros iniciales.
 */
function escribirFilasTexto_(sh, desdeFila, filas, columnasTexto) {
  if (!filas.length) return;
  const ancho = filas[0].length;
  asegurarFilas_(sh, desdeFila + filas.length - 1);
  (columnasTexto || []).forEach(function (c) {
    if (c !== undefined && c !== null && c >= 0) sh.getRange(desdeFila, c + 1, filas.length, 1).setNumberFormat('@');
  });
  sh.getRange(desdeFila, 1, filas.length, ancho).setValues(filas);
}

function registrarSolicitudWeb_(entrada) {
  const solicitud = normalizarSolicitudWeb_(entrada);
  return conLock_(function () {
    const ahora = new Date();
    const productosPorCodigo = {};
    leerProductos_().forEach(function (producto) {
      productosPorCodigo[producto.codigo] = producto;
    });
    solicitud.items.forEach(function (item) {
      if (!productosPorCodigo[item.codigo]) {
        throw new Error('No existe el producto ' + item.codigo + '.');
      }
    });

    const shCotizaciones = hoja_(SHEETS.COTIZACIONES);
    const mapCotizaciones = mapaColumnas_(shCotizaciones, COTIZACIONES_REQUERIDAS);
    const tablaCotizaciones = filasTabla_(shCotizaciones, mapCotizaciones);
    const cotizacionExistente = tablaCotizaciones.filas.find(function (fila) {
      return texto_(fila[mapCotizaciones.CLAVE_SOLICITUD]) === solicitud.requestKey;
    });
    if (cotizacionExistente) {
      return {
        ok: true,
        id: texto_(cotizacionExistente[mapCotizaciones.REFERENCIA]),
        duplicate: true
      };
    }

    // CLIENTES: se busca por email. Un formulario público NO puede sobrescribir
    // los datos de un cliente existente (cualquiera que conozca su correo podría
    // cambiarle el teléfono). Solo se completan campos vacíos; lo que la persona
    // escribió en esta solicitud queda guardado en la propia cotización.
    const shClientes = hoja_(SHEETS.CLIENTES);
    const mapClientes = mapaColumnas_(shClientes, HEADERS.CLIENTES);
    const tablaClientes = filasTabla_(shClientes, mapClientes);
    let clienteId = '';
    let clienteIndice = -1;
    tablaClientes.filas.some(function (fila, index) {
      if (texto_(fila[mapClientes.EMAIL]).toLowerCase() === solicitud.customer.email) {
        clienteId = fila[mapClientes.ID];
        clienteIndice = index;
        return true;
      }
      return false;
    });

    const datosCliente = {
      NOMBRE: solicitud.customer.name,
      EMPRESA: solicitud.customer.company,
      TELEFONO: solicitud.customer.phone
    };
    if (clienteIndice >= 0) {
      const anterior = tablaClientes.filas[clienteIndice].slice();
      let completo = false;
      Object.keys(datosCliente).forEach(function (col) {
        if (!texto_(anterior[mapClientes[col]])) {
          anterior[mapClientes[col]] = celdaSegura_(datosCliente[col]);
          completo = true;
        }
      });
      if (completo) {
        anterior[mapClientes.FECHA_ACTUALIZACION] = ahora;
        escribirFilasTexto_(shClientes, clienteIndice + 2, [anterior], [mapClientes.TELEFONO]);
      }
    } else {
      clienteId = siguienteIdTabla_(tablaClientes.filas, mapClientes.ID);
      const filaCliente = new Array(tablaClientes.ancho).fill('');
      filaCliente[mapClientes.ID] = clienteId;
      filaCliente[mapClientes.NOMBRE] = celdaSegura_(datosCliente.NOMBRE);
      filaCliente[mapClientes.EMPRESA] = celdaSegura_(datosCliente.EMPRESA);
      filaCliente[mapClientes.EMAIL] = celdaSegura_(solicitud.customer.email);
      filaCliente[mapClientes.TELEFONO] = celdaSegura_(datosCliente.TELEFONO);
      filaCliente[mapClientes.FECHA_CREACION] = ahora;
      filaCliente[mapClientes.FECHA_ACTUALIZACION] = ahora;
      escribirFilasTexto_(shClientes, Math.max(shClientes.getLastRow(), 1) + 1, [filaCliente], [mapClientes.TELEFONO]);
    }

    const cotizacionId = siguienteIdTabla_(tablaCotizaciones.filas, mapCotizaciones.ID);
    const referencia = 'CR-' +
      Utilities.formatDate(ahora, Session.getScriptTimeZone(), 'yyyyMMdd') +
      '-' + String(cotizacionId).padStart(3, '0');
    const filaCotizacion = new Array(tablaCotizaciones.ancho).fill('');
    filaCotizacion[mapCotizaciones.ID] = cotizacionId;
    filaCotizacion[mapCotizaciones.REFERENCIA] = referencia;
    filaCotizacion[mapCotizaciones.CLIENTE_ID] = clienteId;
    filaCotizacion[mapCotizaciones.ESTADO] = 'NUEVA';
    filaCotizacion[mapCotizaciones.NOTAS] = celdaSegura_(solicitud.notes);
    filaCotizacion[mapCotizaciones.FECHA_CREACION] = ahora;
    filaCotizacion[mapCotizaciones.CLAVE_SOLICITUD] = solicitud.requestKey;
    // Copia de lo que escribió la persona (si las columnas ya existen).
    const contacto = {
      CONTACTO_NOMBRE: solicitud.customer.name,
      CONTACTO_EMPRESA: solicitud.customer.company,
      CONTACTO_EMAIL: solicitud.customer.email,
      CONTACTO_TELEFONO: solicitud.customer.phone
    };
    Object.keys(contacto).forEach(function (col) {
      if (mapCotizaciones[col] !== undefined) filaCotizacion[mapCotizaciones[col]] = celdaSegura_(contacto[col]);
    });
    escribirFilasTexto_(shCotizaciones, Math.max(shCotizaciones.getLastRow(), 1) + 1, [filaCotizacion],
      [mapCotizaciones.CLAVE_SOLICITUD, mapCotizaciones.CONTACTO_TELEFONO]);

    const shItems = hoja_(SHEETS.COTIZACION_ITEMS);
    const mapItems = mapaColumnas_(shItems, HEADERS.COTIZACION_ITEMS);
    const anchoItems = shItems.getLastColumn();
    const filasItems = solicitud.items.map(function (item) {
      const producto = productosPorCodigo[item.codigo];
      const fila = new Array(anchoItems).fill('');
      fila[mapItems.COTIZACION_ID] = cotizacionId;
      fila[mapItems.CODIGO] = item.codigo;
      fila[mapItems.NOMBRE] = celdaSegura_(producto.nombre || item.nombre);
      fila[mapItems.CANTIDAD] = item.cantidad;
      fila[mapItems.ACABAMENTO] = celdaSegura_(item.acabamento);
      fila[mapItems.PERSONALIZACION] = celdaSegura_(item.personalizacion);
      fila[mapItems.PRECIO_REFERENCIA] =
        producto.precioValido && producto.precio !== null ? producto.precio : '';
      fila[mapItems.MONEDA] = producto.moneda || getConfig_('MONEDA') || APP.MONEDA_DEFECTO;
      return fila;
    });
    escribirFilasTexto_(shItems, Math.max(shItems.getLastRow(), 1) + 1, filasItems, [mapItems.CODIGO]);

    registrarLog_('COTIZACION_WEB', referencia,
      solicitud.items.length + ' producto(s) · ' + solicitud.customer.company, 'OK');
    return { ok: true, id: referencia };
  });
}
