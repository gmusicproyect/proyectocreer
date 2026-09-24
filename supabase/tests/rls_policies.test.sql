begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select ok((select relrowsecurity from pg_class where oid = 'public.tenants'::regclass), 'tenants has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.memberships'::regclass), 'memberships has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.products'::regclass), 'products has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.product_costs'::regclass), 'product costs has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.customers'::regclass), 'customers has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.quotation_requests'::regclass), 'quotations has RLS');
select ok(has_table_privilege('anon', 'public.products', 'select'), 'anonymous visitors can read products');
select ok(not has_table_privilege('anon', 'public.products', 'insert'), 'anonymous visitors cannot insert products');
select ok(not has_table_privilege('anon', 'public.product_costs', 'select'), 'anonymous visitors cannot read costs');
select ok(not has_table_privilege('anon', 'public.customers', 'select'), 'anonymous visitors cannot read customers');
select ok(has_function_privilege('anon', 'public.submit_quote(text,text,text,text,text,text,jsonb)', 'execute'), 'anonymous visitors can submit through the safe RPC');
select ok(not has_table_privilege('anon', 'public.quotation_requests', 'insert'), 'anonymous visitors cannot insert quotations directly');

select * from finish();
rollback;
