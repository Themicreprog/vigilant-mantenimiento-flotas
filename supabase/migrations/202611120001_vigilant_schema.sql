create extension if not exists pgcrypto;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  full_name text not null default '',
  role text not null default 'driver' check (role in ('admin', 'driver')),
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plate text not null check (char_length(plate) between 2 and 16),
  make text not null,
  model text not null,
  year integer not null check (year between 1950 and 2100),
  mileage integer not null default 0 check (mileage >= 0),
  status text not null default 'active' check (status in ('active', 'maintenance', 'inactive')),
  created_at timestamptz not null default now(),
  unique (company_id, plate),
  unique (id, company_id)
);

create table public.vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade,
  unique (vehicle_id, user_id)
);

create table public.maintenances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null,
  service_date date not null,
  mileage integer not null check (mileage >= 0),
  type text not null check (type in ('Aceite', 'Frenos', 'Llantas', 'Inspección', 'Batería', 'Otro')),
  cost numeric(12,2) not null check (cost >= 0),
  workshop text not null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade
);

create table public.maintenance_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null check (type in ('Aceite', 'Frenos', 'Llantas', 'Inspección', 'Batería', 'Otro')),
  interval_km integer check (interval_km > 0),
  interval_days integer check (interval_days > 0),
  lead_km integer not null default 1000 check (lead_km >= 0),
  lead_days integer not null default 14 check (lead_days >= 0),
  active boolean not null default true,
  unique (company_id, type),
  check (interval_km is not null or interval_days is not null)
);

create index vehicles_company_idx on public.vehicles(company_id, plate);
create index vehicle_assignments_user_idx on public.vehicle_assignments(user_id, vehicle_id);
create index maintenances_vehicle_date_idx on public.maintenances(vehicle_id, service_date desc);
create index maintenances_company_date_idx on public.maintenances(company_id, service_date desc);
create index maintenance_rules_company_idx on public.maintenance_rules(company_id, active);

create or replace function public.prevent_vehicle_mileage_rollback()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.mileage < old.mileage then
    raise exception 'El kilometraje no puede retroceder.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger vehicles_mileage_never_decreases
  before update of mileage on public.vehicles
  for each row execute procedure public.prevent_vehicle_mileage_rollback();

create or replace function public.sync_vehicle_mileage_from_maintenance()
returns trigger language plpgsql set search_path = public as $$
begin
  update public.vehicles
  set mileage = greatest(mileage, new.mileage)
  where id = new.vehicle_id and company_id = new.company_id;
  return new;
end;
$$;

create trigger maintenance_advances_vehicle_mileage
  after insert or update on public.maintenances
  for each row execute procedure public.sync_vehicle_mileage_from_maintenance();

create or replace function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'driver')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_auth_user();

create or replace function public.is_company_admin(target_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.company_id = target_company and p.role = 'admin'
  );
$$;

create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.company_id from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.is_assigned_vehicle(target_vehicle uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.vehicle_assignments a
    where a.vehicle_id = target_vehicle and a.user_id = (select auth.uid())
  );
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_assignments enable row level security;
alter table public.maintenances enable row level security;
alter table public.maintenance_rules enable row level security;

create policy "members read their company" on public.companies for select to authenticated
  using (id = (select public.current_company_id()));

create policy "members read same company profiles" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or company_id = (select public.current_company_id()));
create policy "users update their own display name" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "admin reads company vehicles" on public.vehicles for select to authenticated
  using (public.is_company_admin(company_id));
create policy "drivers read assigned vehicles" on public.vehicles for select to authenticated
  using (public.is_assigned_vehicle(id));
create policy "admins manage vehicles" on public.vehicles for all to authenticated
  using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "members read own assignments" on public.vehicle_assignments for select to authenticated
  using (user_id = (select auth.uid()) or public.is_company_admin(company_id));
create policy "admins manage assignments" on public.vehicle_assignments for all to authenticated
  using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "members read permitted maintenance history" on public.maintenances for select to authenticated
  using (public.is_company_admin(company_id) or public.is_assigned_vehicle(vehicle_id));
create policy "admins manage maintenance records" on public.maintenances for all to authenticated
  using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "members read company alert rules" on public.maintenance_rules for select to authenticated
  using (company_id = (select public.current_company_id()));
create policy "admins manage company alert rules" on public.maintenance_rules for all to authenticated
  using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create or replace view public.maintenance_history with (security_invoker = true) as
  select id, company_id, vehicle_id, service_date, mileage, type, workshop, notes, created_by, created_at
  from public.maintenances;

revoke all on public.companies, public.profiles, public.vehicles, public.vehicle_assignments, public.maintenances, public.maintenance_rules from anon;
revoke all on public.maintenances from authenticated;
grant select on public.companies, public.profiles, public.vehicles, public.vehicle_assignments, public.maintenance_rules, public.maintenance_history to authenticated;
grant select (id, company_id, vehicle_id, service_date, mileage, type, workshop, notes, created_by, created_at) on public.maintenances to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant insert, update, delete on public.vehicles, public.vehicle_assignments, public.maintenances, public.maintenance_rules to authenticated;
grant all on public.companies, public.profiles, public.vehicles, public.vehicle_assignments, public.maintenances, public.maintenance_rules to service_role;
