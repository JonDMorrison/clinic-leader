-- Create user_roles table using existing user_role enum
create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role user_role not null,
    created_at timestamp with time zone default now(),
    unique (user_id)
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Create security definer function to get user role
create or replace function public.get_user_role(_user_id uuid)
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where user_id = _user_id
  limit 1
$$;

-- Helper function to check if user has specific role
create or replace function public.has_role(_user_id uuid, _role user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Helper function to check if user is admin (owner/director)
create or replace function public.is_user_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role in ('owner', 'director')
  )
$$;

-- Helper function to check if user is manager or above
create or replace function public.is_user_manager(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role in ('owner', 'director', 'manager')
  )
$$;

-- RLS policies for user_roles
create policy "Users can view their own role"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can manage all roles"
on public.user_roles
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
    and ur.role in ('owner', 'director')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
    and ur.role in ('owner', 'director')
  )
);

-- Migrate existing roles from users table to user_roles (only for users that exist in auth.users)
insert into public.user_roles (user_id, role)
select u.id, u.role
from public.users u
where u.role is not null
  and exists (select 1 from auth.users au where au.id = u.id)
on conflict (user_id) do nothing;