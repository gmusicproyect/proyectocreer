# Desarrollo por capas

1. **Fundación — entregada:** estructura, contratos, identidad, navegación y módulos vacíos.
2. **Identidad y persistencia — preparada localmente:** clientes Supabase, migración, tenant/membresías, login/logout, confirmación, RLS, Storage y auditoría. Falta enlazar el proyecto remoto, aplicar la migración y crear los usuarios iniciales.
3. **Laboratorio comercial — demostración local entregada:** 20 productos, fichas, imágenes, variantes, selección, formulario y solicitudes visibles en el panel. Los registros viven solo en el navegador.
4. **Catálogo y gestión persistente:** CRUD de productos/categorías, imágenes, publicación, costos privados y migración del laboratorio a Supabase. Verificar que ningún costo llegue al cliente público.
5. **Comercial real — entrada preparada:** el formulario puede registrar solicitudes en Supabase mediante una función validada. Falta la gestión completa de clientes, elaboración de la cotización, seguimiento e importes instantáneos validados en servidor.
6. **Operación SaaS:** planes, suscripciones, soporte, respaldos probados, exportación y despliegue.

Definir y revisar cada capa antes de implementarla. Capa 01 no importa productos del catálogo externo ni presenta productos ficticios como inventario real.
