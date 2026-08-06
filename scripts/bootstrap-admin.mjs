// Одноразовий скрипт: створює першого суперадміна адмін-панелі.
// Потрібен, бо в порожній таблиці admin_users нікому нема чим залогінитись —
// а редагувати саму таблицю в UI можна лише вже маючи суперадміна.
//
// Перед запуском виконай supabase/sql/001_admin_users.sql у Supabase SQL Editor.
//
// Використання:
//   node scripts/bootstrap-admin.mjs <email> <password> ["Ім'я"]
//
// Читає VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_KEY з .env у корені проєкту.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnv() {
  const text = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const [, , email, password, fullName] = process.argv;

if (!email || !password) {
  console.error('Використання: node scripts/bootstrap-admin.mjs <email> <password> ["Ім\'я"]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Пароль має бути не коротшим за 8 символів.');
  process.exit(1);
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('У .env немає VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (createError) {
    console.error('Не вдалося створити користувача в Supabase Auth:', createError.message);
    process.exit(1);
  }

  const userId = created.user.id;

  const { error: insertError } = await supabaseAdmin.from('admin_users').insert({
    id: userId,
    email,
    full_name: fullName ?? null,
    role: 'superadmin',
    is_active: true,
  });

  if (insertError) {
    console.error('Auth-користувача створено, але запис у admin_users не вдався:', insertError.message);
    console.error('Виконав(-ла) SQL з supabase/sql/001_admin_users.sql? Таблиця admin_users має існувати.');
    process.exit(1);
  }

  console.log(`Суперадміна створено: ${email} (id: ${userId}).`);
  console.log('Тепер можна залогінитись цими даними на сторінці /login адмін-панелі.');
}

main();
