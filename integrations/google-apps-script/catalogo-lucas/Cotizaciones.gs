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
    const mapCotizaciones = mapaColumnas_(shCotizaciones, HEADERS.COTIZACIONES);
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

    const shClientes = hoja_(SHEETS.CLIENTES);
    const mapClientes = mapaColumnas_(shClientes, HEADERS.CLIENTES);
    const tablaClientes = filasTabla_(shClientes, mapClientes);
    let clienteId = '';
    let clienteFila = -1;

    tablaClientes.filas.some(function (fila, index) {
      if (texto_(fila[mapClientes.EMAIL]).toLowerCase() === solicitud.customer.email) {
        clienteId = fila[mapClientes.ID];
        clienteFila = index + 2;
        return true;
      }
      return false;
    });

    const filaCliente = new Array(tablaClientes.ancho).fill('');
    if (clienteFila > 0) {
      const anterior = shClientes.getRange(clienteFila, 1, 1, tablaClientes.ancho).getValues()[0];
      anterior[mapClientes.NOMBRE] = celdaSegura_(solicitud.customer.name);
      anterior[mapClientes.EMPRESA] = celdaSegura_(solicitud.customer.company);
      anterior[mapClientes.TELEFONO] = celdaSegura_(solicitud.customer.phone);
      anterior[mapClientes.FECHA_ACTUALIZACION] = ahora;
      shClientes.getRange(clienteFila, 1, 1, tablaClientes.ancho).setValues([anterior]);
    } else {
      clienteId = siguienteIdTabla_(tablaClientes.filas, mapClientes.ID);
      filaCliente[mapClientes.ID] = clienteId;
      filaCliente[mapClientes.NOMBRE] = celdaSegura_(solicitud.customer.name);
      filaCliente[mapClientes.EMPRESA] = celdaSegura_(solicitud.customer.company);
      filaCliente[mapClientes.EMAIL] = celdaSegura_(solicitud.customer.email);
      filaCliente[mapClientes.TELEFONO] = celdaSegura_(solicitud.customer.phone);
      filaCliente[mapClientes.FECHA_CREACION] = ahora;
      filaCliente[mapClientes.FECHA_ACTUALIZACION] = ahora;
      shClientes.appendRow(filaCliente);
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
    shCotizaciones.appendRow(filaCotizacion);

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
    shItems.getRange(shItems.getLastRow() + 1, 1, filasItems.length, anchoItems)
      .setValues(filasItems);

    registrarLog_('COTIZACION_WEB', referencia,
      solicitud.items.length + ' producto(s) · ' + solicitud.customer.company, 'OK');
    return { ok: true, id: referencia };
  });
}
