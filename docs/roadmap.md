# Desarrollo por capas

1. **Fundación — entregada:** estructura, contratos, identidad, navegación y módulos vacíos.
2. **Identidad y persistencia — preparada localmente:** clientes Supabase, migración, tenant/membresías, login/logout, confirmación, RLS, Storage y auditoría. Falta enlazar el proyecto remoto, aplicar la migración y crear los usuarios iniciales.
3. **Laboratorio comercial — conectado:** 20 productos reales, fichas, imágenes de Drive, filtros, selección, formulario y solicitudes visibles en el panel. El catálogo lee la hoja maestra de Gmusic y conserva una copia segura de presentación.
4. **Catálogo y gestión persistente — importador instalado:** Apps Script administra productos e importa imágenes desde Drive. La prueba real confirmó importación reanudable y ausencia de duplicados. Falta que Lucas agregue precios y marque los productos como PUBLICADO. Los costos siguen separados y nunca llegan al catálogo público.
5. **Comercial real — entrada preparada:** el formulario puede registrar solicitudes en Supabase mediante una función validada. Falta la gestión completa de clientes, elaboración de la cotización, seguimiento e importes instantáneos validados en servidor.
6. **Operación SaaS:** planes, suscripciones, soporte, respaldos probados, exportación y despliegue.

Definir y revisar cada capa antes de implementarla. Capa 01 no importa productos del catálogo externo ni presenta productos ficticios como inventario real.
