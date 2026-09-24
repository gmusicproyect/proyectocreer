# Validación de Capa 01

- ESLint: aprobado.
- TypeScript sin emisión: aprobado.
- Pruebas automatizadas: 3 aprobadas (permisos por empresa/rol, exclusión de costos, bloqueo de preview en producción).
- Compilación optimizada Next.js: aprobada.
- Navegador: revisión visual a 1280px y 390px de catálogo y panel; búsqueda vacía muestra el término ingresado y ofrece limpiar.
- Servidor de producción con bandera de preview activada deliberadamente: las siete rutas del panel devuelven 307 hacia /acesso. Las cuatro rutas públicas devuelven 200.
- Recorrido del laboratorio comprobado en navegador: ficha → color/cantidad/personalización → carrito → formulario → confirmación → solicitud visible en administración.

No se han probado flujos de autenticación, persistencia o facturación porque pertenecen a las siguientes capas y no están implementados.
