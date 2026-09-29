# Desarrollo por capas

1. **Fundación — entregada:** estructura, contratos, identidad, navegación y módulos vacíos.
2. **Identidad y persistencia — preparada localmente:** clientes Supabase, migración, tenant/membresías, login/logout, confirmación, RLS, Storage y auditoría. Falta enlazar el proyecto remoto, aplicar la migración y crear los usuarios iniciales.
3. **Laboratorio comercial — conectado:** 20 productos reales, fichas, imágenes de Drive, filtros, selección, formulario y solicitudes visibles en el panel. El catálogo lee la hoja maestra de Gmusic y conserva una copia segura de presentación.
4. **Catálogo y gestión persistente — panel operativo entregado (planilla):** Apps Script importa imágenes desde Drive sin duplicados. Desde el panel se crean y editan productos, se suben o asocian imágenes, se completan precios, se cambia el estado (Pendente, Publicado, Inativo), se administran categorías y se registran costos internos privados (pestaña `COSTOS`, ADR 002). Falta migrar todo a Supabase cuando exista el proyecto remoto.
5. **Comercial real — seguimiento entregado (planilla):** clientes sin duplicados, situación y notas internas de cada cotización desde el panel, con control de conflictos. Falta elaborar la propuesta con importes validados en servidor y enviarla al cliente.
6. **Operación SaaS:** planes, suscripciones, soporte, respaldos probados, exportación y despliegue.

Definir y revisar cada capa antes de implementarla. Capa 01 no importa productos del catálogo externo ni presenta productos ficticios como inventario real.
