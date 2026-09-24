insert into public.tenants (id, slug, name, legal_name, currency_code, active)
values ('00000000-0000-4000-8000-000000000001', 'creer', 'Creer', 'Creer Brindes Corporativos', 'BRL', true)
on conflict (id) do update set
  name = excluded.name,
  legal_name = excluded.legal_name,
  currency_code = excluded.currency_code,
  active = excluded.active;

insert into public.categories (tenant_id, slug, name, description, sort_order, active)
values
  ('00000000-0000-4000-8000-000000000001', 'canecas', 'Canecas', 'Canecas e copos reutilizaveis.', 10, true),
  ('00000000-0000-4000-8000-000000000001', 'garrafas', 'Garrafas', 'Garrafas para uso diario e eventos.', 20, true),
  ('00000000-0000-4000-8000-000000000001', 'cadernos', 'Cadernos', 'Cadernos corporativos de materiais conscientes.', 30, true),
  ('00000000-0000-4000-8000-000000000001', 'escritorio', 'Escritorio', 'Acessorios funcionais para mesa e trabalho.', 40, true),
  ('00000000-0000-4000-8000-000000000001', 'kits', 'Kits', 'Combinacoes prontas para presentes corporativos.', 50, true),
  ('00000000-0000-4000-8000-000000000001', 'bolsas', 'Bolsas', 'Bolsas reutilizaveis para rotina e eventos.', 60, true)
on conflict (tenant_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  active = excluded.active;

with product_seed (sku, slug, name, short_description, category_slug, image_path, colors) as (
  values
    ('ECO-101', 'caneca-eco-fibra-natural', 'Caneca Eco Fibra Natural', 'Caneca leve para a rotina corporativa.', 'canecas', '/catalog/eco-101.png', array['Natural', 'Verde', 'Preto']),
    ('ECO-102', 'copo-eco-com-tampa', 'Copo Eco com Tampa', 'Copo reutilizavel com tampa segura.', 'canecas', '/catalog/eco-102.png', array['Natural', 'Azul', 'Preto']),
    ('ECO-103', 'caneca-bambu-classic', 'Caneca Bambu Classic', 'Acabamento natural para presentes de marca.', 'canecas', '/catalog/eco-103.png', array['Bambu', 'Branco']),
    ('ECO-104', 'copo-termico-eco', 'Copo Termico Eco', 'Conservacao termica em formato pratico.', 'canecas', '/catalog/eco-104.png', array['Natural', 'Preto']),
    ('ECO-105', 'caneca-cortica-office', 'Caneca Cortica Office', 'Base de cortica e visual corporativo.', 'canecas', '/catalog/eco-105.png', array['Natural', 'Branco']),
    ('ECO-201', 'garrafa-eco-500', 'Garrafa Eco 500', 'Garrafa versatil de 500 ml.', 'garrafas', '/catalog/eco-201.png', array['Verde', 'Azul', 'Preto']),
    ('ECO-202', 'garrafa-bambu-loop', 'Garrafa Bambu Loop', 'Tampa em bambu e alca de transporte.', 'garrafas', '/catalog/eco-202.png', array['Natural', 'Branco']),
    ('ECO-203', 'garrafa-inox-nature', 'Garrafa Inox Nature', 'Estrutura resistente para uso frequente.', 'garrafas', '/catalog/eco-203.png', array['Inox', 'Preto']),
    ('ECO-204', 'squeeze-eco-sport', 'Squeeze Eco Sport', 'Formato esportivo para acoes e equipes.', 'garrafas', '/catalog/eco-204.png', array['Verde', 'Azul', 'Cinza']),
    ('ECO-205', 'garrafa-cortica-premium', 'Garrafa Cortica Premium', 'Detalhe em cortica para kits especiais.', 'garrafas', '/catalog/eco-205.png', array['Natural', 'Preto']),
    ('ECO-301', 'caderno-kraft-a5', 'Caderno Kraft A5', 'Caderno compacto com capa kraft.', 'cadernos', '/catalog/eco-301.png', array['Kraft', 'Verde']),
    ('ECO-302', 'caderno-bambu-executive', 'Caderno Bambu Executive', 'Capa rigida de visual executivo.', 'cadernos', '/catalog/eco-302.png', array['Bambu', 'Preto']),
    ('ECO-303', 'bloco-reciclado-pocket', 'Bloco Reciclado Pocket', 'Bloco pequeno para eventos e reunioes.', 'cadernos', '/catalog/eco-303.png', array['Kraft']),
    ('ECO-304', 'planner-eco-semanal', 'Planner Eco Semanal', 'Organizacao semanal para equipes.', 'cadernos', '/catalog/eco-304.png', array['Natural', 'Verde']),
    ('ECO-401', 'suporte-bambu-desk', 'Suporte Bambu Desk', 'Suporte funcional para celular.', 'escritorio', '/catalog/eco-401.png', array['Bambu']),
    ('ECO-402', 'caneta-eco-touch', 'Caneta Eco Touch', 'Caneta com ponteira touch e corpo natural.', 'escritorio', '/catalog/eco-402.png', array['Natural', 'Preto', 'Azul']),
    ('ECO-403', 'organizador-cortica', 'Organizador Cortica', 'Organizador compacto para mesa.', 'escritorio', '/catalog/eco-403.png', array['Cortica']),
    ('ECO-501', 'kit-boas-vindas-eco', 'Kit Boas-vindas Eco', 'Selecao pronta para integrar equipes.', 'kits', '/catalog/eco-501.png', array['Natural']),
    ('ECO-502', 'kit-cafe-consciente', 'Kit Cafe Consciente', 'Experiencia de cafe para presentear.', 'kits', '/catalog/eco-502.png', array['Natural', 'Preto']),
    ('ECO-601', 'ecobag-algodao-natural', 'Ecobag Algodao Natural', 'Bolsa reutilizavel para eventos e rotina.', 'bolsas', '/catalog/eco-601.png', array['Natural', 'Preto'])
)
insert into public.products (
  tenant_id, category_id, sku, slug, name, short_description, description,
  main_image_url, currency_code, price_minor, minimum_quantity,
  available_colors, published, featured
)
select
  '00000000-0000-4000-8000-000000000001',
  categories.id,
  product_seed.sku,
  product_seed.slug,
  product_seed.name,
  product_seed.short_description,
  product_seed.short_description || ' Disponivel para personalizacao corporativa sob consulta.',
  product_seed.image_path,
  'BRL',
  null,
  25,
  product_seed.colors,
  true,
  product_seed.sku in ('ECO-101', 'ECO-202', 'ECO-301', 'ECO-501')
from product_seed
join public.categories
  on categories.tenant_id = '00000000-0000-4000-8000-000000000001'
  and categories.slug = product_seed.category_slug
on conflict (tenant_id, sku) do update set
  category_id = excluded.category_id,
  slug = excluded.slug,
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description,
  main_image_url = excluded.main_image_url,
  minimum_quantity = excluded.minimum_quantity,
  available_colors = excluded.available_colors,
  published = excluded.published,
  featured = excluded.featured;

insert into public.product_images (tenant_id, product_id, image_url, alt_text, sort_order)
select products.tenant_id, products.id, products.main_image_url, products.name, 0
from public.products
where products.tenant_id = '00000000-0000-4000-8000-000000000001'
  and products.main_image_url is not null
  and not exists (
    select 1 from public.product_images
    where product_images.product_id = products.id
      and product_images.image_url = products.main_image_url
  );

insert into public.subscriptions (tenant_id, plan_code, status)
values ('00000000-0000-4000-8000-000000000001', 'catalog-lab', 'trial')
on conflict (tenant_id) do nothing;
