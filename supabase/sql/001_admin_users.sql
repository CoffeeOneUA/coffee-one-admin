-- Хто має доступ до адмін-панелі coffee-one-admin і з якою роллю.
-- Виконати один раз вручну в Supabase → SQL Editor (проєкт tnxaloqyaksfojimflbd).
--
-- Сама автентифікація йде через Supabase Auth (auth.users, email+пароль).
-- Цей рядок у admin_users — це "перепустка": якщо користувача тут немає
-- або is_active = false, вхід в адмінку буде відхилено навіть за дійсної
-- пари email/пароль.

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'admin' check (role in ('superadmin', 'admin', 'moderator')),
  is_active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is 'Перепустка в адмін-панель: хто з auth.users має доступ і з якою роллю.';
comment on column public.admin_users.role is 'superadmin — повний доступ + керування іншими адмінами; admin/moderator — доступ до панелі без керування адмінами.';

alter table public.admin_users enable row level security;

-- Записує/редагує адмінів лише сервісний ключ (supabaseAdmin у фронтенді, як і решта таблиць у проєкті).
-- Звичайному залогіненому адміну потрібно вміти прочитати ЛИШЕ власний рядок —
-- саме це і перевіряється при вході та при відновленні сесії.
create policy "admin_users_select_self" on public.admin_users
  for select
  using (auth.uid() = id);

-- Бутстрап першого суперадміна виконує окремий скрипт (scripts/bootstrap-admin.mjs),
-- який створює auth-користувача і одразу додає йому цей рядок із роллю superadmin.
