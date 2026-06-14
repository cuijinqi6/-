create extension if not exists pgcrypto;

create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  category text not null check (char_length(trim(category)) > 0),
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  remark text,
  total_amount numeric(10, 2) not null default 0 check (total_amount >= 0),
  status text not null default 'new' check (status in ('new', 'handled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  dish_id uuid references public.dishes(id) on delete set null,
  dish_name text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_dishes_updated_at on public.dishes;
create trigger set_dishes_updated_at
before update on public.dishes
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.create_order(p_remark text, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  computed_total numeric(10, 2);
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception '订单不能为空';
  end if;

  create temp table selected_order_items on commit drop as
    select
      d.id as dish_id,
      d.name as dish_name,
      d.price as unit_price,
      greatest((item->>'quantity')::integer, 1) as quantity,
      d.price * greatest((item->>'quantity')::integer, 1) as subtotal
    from jsonb_array_elements(p_items) as item
    join public.dishes d on d.id = (item->>'dish_id')::uuid
    where d.is_available = true;

  if (select count(*) from selected_order_items) <> jsonb_array_length(p_items) then
    raise exception '订单中有不可用菜品';
  end if;

  select coalesce(sum(subtotal), 0)::numeric(10, 2)
  into computed_total
  from selected_order_items;

  insert into public.orders (remark, total_amount)
  values (nullif(trim(p_remark), ''), computed_total)
  returning id into new_order_id;

  insert into public.order_items (
    order_id,
    dish_id,
    dish_name,
    unit_price,
    quantity,
    subtotal
  )
  select
    new_order_id,
    dish_id,
    dish_name,
    unit_price,
    quantity,
    subtotal
  from selected_order_items;

  return new_order_id;
end;
$$;

alter table public.dishes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Public can read available dishes" on public.dishes;
create policy "Public can read available dishes"
on public.dishes for select
using (is_available = true or auth.role() = 'authenticated');

drop policy if exists "Admins manage dishes" on public.dishes;
create policy "Admins manage dishes"
on public.dishes for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Admins read orders" on public.orders;
create policy "Admins read orders"
on public.orders for select
using (auth.role() = 'authenticated');

drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders"
on public.orders for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Admins read order items" on public.order_items;
create policy "Admins read order items"
on public.order_items for select
using (auth.role() = 'authenticated');

grant execute on function public.create_order(text, jsonb) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('dish-images', 'dish-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read dish images" on storage.objects;
create policy "Public can read dish images"
on storage.objects for select
using (bucket_id = 'dish-images');

drop policy if exists "Admins upload dish images" on storage.objects;
create policy "Admins upload dish images"
on storage.objects for insert
with check (bucket_id = 'dish-images' and auth.role() = 'authenticated');

drop policy if exists "Admins update dish images" on storage.objects;
create policy "Admins update dish images"
on storage.objects for update
using (bucket_id = 'dish-images' and auth.role() = 'authenticated')
with check (bucket_id = 'dish-images' and auth.role() = 'authenticated');

drop policy if exists "Admins delete dish images" on storage.objects;
create policy "Admins delete dish images"
on storage.objects for delete
using (bucket_id = 'dish-images' and auth.role() = 'authenticated');

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
end;
$$;
