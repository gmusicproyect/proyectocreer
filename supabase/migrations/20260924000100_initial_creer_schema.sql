create extension if not exists pgcrypto;

create type public.membership_role as enum ('provider_owner', 'tenant_admin', 'sales', 'catalog_editor');
create type public.quote_status as enum ('new', 'reviewing', 'quoted', 'approved', 'rejected', 'expired');
create type public.subscription_status as enum ('trial', 'active', 'past_due', 'paused', 'cancelled');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  legal_name text,
  currency_code text not null default 'BRL' check (char_length(currency_code) = 3),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null default 'sales',
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  sku text not null,
  slug text not null,
  name text not null,
  short_description text,
  description text,
  main_image_url text,
  currency_code text not null default 'BRL' check (char_length(currency_code) = 3),
  price_minor bigint check (price_minor is null or price_minor >= 0),
  minimum_quantity integer not null default 1 check (minimum_quantity > 0),
  available_colors text[] not null default '{}',
  published boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, sku),
  unique (tenant_id, slug)
);

create table public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cost_minor bigint not null default 0 check (cost_minor >= 0),
  supplier_name text,
  notes text,
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  tax_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotation_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  reference text not null unique default ('CR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  status public.quote_status not null default 'new',
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  notes text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  quotation_id uuid not null references public.quotation_requests(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  color text,
  personalization text,
  unit_price_minor bigint check (unit_price_minor is null or unit_price_minor >= 0),
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  plan_code text not null default 'catalog',
  status public.subscription_status not null default 'trial',
  monthly_price_minor bigint check (monthly_price_minor is null or monthly_price_minor >= 0),
  provider_reference text,
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index memberships_user_id_idx on public.memberships(user_id);
create index products_catalog_idx on public.products(tenant_id, published, category_id);
create index product_images_product_idx on public.product_images(product_id, sort_order);
create index customers_tenant_idx on public.customers(tenant_id, created_at desc);
create index quotation_requests_tenant_idx on public.quotation_requests(tenant_id, created_at desc);
create index quotation_items_quotation_idx on public.quotation_items(quotation_id);
create index audit_logs_tenant_idx on public.audit_logs(tenant_id, created_at desc);

create function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_set_updated_at before update on public.tenants for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_costs_set_updated_at before update on public.product_costs for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger quotation_requests_set_updated_at before update on public.quotation_requests for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

create function public.is_tenant_member(target_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where tenant_id = target_tenant_id and user_id = auth.uid()
  );
$$;

create function public.has_tenant_role(target_tenant_id uuid, allowed_roles public.membership_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where tenant_id = target_tenant_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

create function public.submit_quote(
  p_tenant_slug text,
  p_company_name text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_items jsonb
)
returns table (quotation_id uuid, reference text)
language plpgsql security definer set search_path = '' as $$
declare
  selected_tenant_id uuid;
  new_quotation_id uuid;
  new_reference text;
  item jsonb;
  selected_product record;
  requested_quantity integer;
begin
  if coalesce(length(trim(p_company_name)), 0) < 2
    or coalesce(length(trim(p_contact_name)), 0) < 2
    or coalesce(length(trim(p_email)), 0) < 5 then
    raise exception 'Dados de contato incompletos';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'A solicitacao deve conter entre 1 e 50 itens';
  end if;

  select id into selected_tenant_id from public.tenants
  where slug = p_tenant_slug and active = true;
  if selected_tenant_id is null then raise exception 'Empresa indisponivel'; end if;

  insert into public.quotation_requests (tenant_id, company_name, contact_name, email, phone, notes)
  values (
    selected_tenant_id,
    trim(p_company_name),
    trim(p_contact_name),
    lower(trim(p_email)),
    nullif(trim(p_phone), ''),
    nullif(trim(p_notes), '')
  )
  returning id, quotation_requests.reference into new_quotation_id, new_reference;

  for item in select value from jsonb_array_elements(p_items) loop
    requested_quantity := coalesce((item ->> 'quantity')::integer, 0);
    select id, sku, name, minimum_quantity into selected_product
    from public.products
    where tenant_id = selected_tenant_id and sku = item ->> 'sku' and published = true;

    if selected_product.id is null then raise exception 'Produto invalido'; end if;
    if requested_quantity < selected_product.minimum_quantity or requested_quantity > 1000000 then
      raise exception 'Quantidade invalida para o produto %', selected_product.sku;
    end if;

    insert into public.quotation_items (
      tenant_id, quotation_id, product_id, sku, product_name, quantity, color, personalization
    ) values (
      selected_tenant_id, new_quotation_id, selected_product.id, selected_product.sku,
      selected_product.name, requested_quantity, nullif(trim(item ->> 'color'), ''),
      nullif(trim(item ->> 'personalization'), '')
    );
  end loop;

  return query select new_quotation_id, new_reference;
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.is_tenant_member(uuid) from public;
revoke all on function public.has_tenant_role(uuid, public.membership_role[]) from public;
revoke all on function public.submit_quote(text, text, text, text, text, text, jsonb) from public;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, public.membership_role[]) to authenticated;
grant execute on function public.submit_quote(text, text, text, text, text, text, jsonb) to anon, authenticated;

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_costs enable row level security;
alter table public.product_images enable row level security;
alter table public.customers enable row level security;
alter table public.quotation_requests enable row level security;
alter table public.quotation_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_logs enable row level security;

create policy "members view tenants" on public.tenants for select to authenticated using (public.is_tenant_member(id));
create policy "users view own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "members view memberships" on public.memberships for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "admins add memberships" on public.memberships for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin']::public.membership_role[]));
create policy "admins update memberships" on public.memberships for update to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin']::public.membership_role[]));
create policy "admins remove memberships" on public.memberships for delete to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin']::public.membership_role[]));

create policy "public views active categories" on public.categories for select to anon
using (active = true and exists (select 1 from public.tenants where tenants.id = categories.tenant_id and tenants.active = true));
create policy "members view categories" on public.categories for select to authenticated
using (public.is_tenant_member(tenant_id) or active = true);
create policy "catalog roles add categories" on public.categories for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[]));
create policy "catalog roles update categories" on public.categories for update to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[]));
create policy "catalog roles remove categories" on public.categories for delete to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[]));

create policy "public views published products" on public.products for select to anon
using (published = true and exists (select 1 from public.tenants where tenants.id = products.tenant_id and tenants.active = true));
create policy "members view products" on public.products for select to authenticated
using (public.is_tenant_member(tenant_id) or published = true);
create policy "catalog roles add products" on public.products for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[]));
create policy "catalog roles update products" on public.products for update to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[]));
create policy "catalog roles remove products" on public.products for delete to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[]));

create policy "admins view costs" on public.product_costs for select to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin']::public.membership_role[]));
create policy "admins add costs" on public.product_costs for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin']::public.membership_role[]));
create policy "admins update costs" on public.product_costs for update to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin']::public.membership_role[]));
create policy "admins remove costs" on public.product_costs for delete to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin']::public.membership_role[]));

create policy "public views published images" on public.product_images for select to anon
using (exists (select 1 from public.products where products.id = product_images.product_id and products.published = true));
create policy "members view product images" on public.product_images for select to authenticated
using (public.is_tenant_member(tenant_id) or exists (
  select 1 from public.products where products.id = product_images.product_id and products.published = true
));
create policy "catalog roles manage product images" on public.product_images for all to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[]));

create policy "sales roles view customers" on public.customers for select to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'sales']::public.membership_role[]));
create policy "sales roles add customers" on public.customers for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'sales']::public.membership_role[]));
create policy "sales roles update customers" on public.customers for update to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'sales']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'sales']::public.membership_role[]));
create policy "admins remove customers" on public.customers for delete to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin']::public.membership_role[]));

create policy "sales roles view quotations" on public.quotation_requests for select to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'sales']::public.membership_role[]));
create policy "sales roles add quotations" on public.quotation_requests for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'sales']::public.membership_role[]));
create policy "sales roles update quotations" on public.quotation_requests for update to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'sales']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'sales']::public.membership_role[]));

create policy "sales roles view quotation items" on public.quotation_items for select to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'sales']::public.membership_role[]));
create policy "sales roles add quotation items" on public.quotation_items for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'sales']::public.membership_role[]));
create policy "sales roles update quotation items" on public.quotation_items for update to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'sales']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin', 'sales']::public.membership_role[]));

create policy "admins view subscriptions" on public.subscriptions for select to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin']::public.membership_role[]));
create policy "provider manages subscriptions" on public.subscriptions for all to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['provider_owner']::public.membership_role[]));
create policy "admins view audit logs" on public.audit_logs for select to authenticated
using (public.has_tenant_role(tenant_id, array['provider_owner', 'tenant_admin']::public.membership_role[]));

revoke all on table public.tenants, public.profiles, public.memberships,
  public.categories, public.products, public.product_costs, public.product_images,
  public.customers, public.quotation_requests, public.quotation_items,
  public.subscriptions, public.audit_logs from anon, authenticated;
grant select on table public.categories, public.products, public.product_images to anon;
grant select on table public.tenants, public.profiles, public.memberships,
  public.categories, public.products, public.product_costs, public.product_images,
  public.customers, public.quotation_requests, public.quotation_items,
  public.subscriptions, public.audit_logs to authenticated;
grant update on table public.profiles to authenticated;
grant insert, update, delete on table public.memberships, public.categories,
  public.products, public.product_costs, public.product_images, public.customers,
  public.quotation_requests, public.quotation_items, public.subscriptions to authenticated;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

create policy "public product image reads" on storage.objects for select to public
using (bucket_id = 'product-images');
create policy "catalog roles upload product images" on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and public.has_tenant_role(((storage.foldername(name))[1])::uuid,
    array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[])
);
create policy "catalog roles update product images" on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and public.has_tenant_role(((storage.foldername(name))[1])::uuid,
    array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[])
)
with check (
  bucket_id = 'product-images'
  and public.has_tenant_role(((storage.foldername(name))[1])::uuid,
    array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[])
);
create policy "catalog roles delete product images" on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and public.has_tenant_role(((storage.foldername(name))[1])::uuid,
    array['provider_owner', 'tenant_admin', 'catalog_editor']::public.membership_role[])
);
