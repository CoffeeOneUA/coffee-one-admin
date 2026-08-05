import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

// Звичайний клієнт для читання публічних даних. Та сама причина, що й у
// supabaseAdmin — адмінка не логінить користувачів через Supabase Auth,
// тож жодній сесії тут зберігатись не треба.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Адмін клієнт з повним доступом. persistSession/autoRefreshToken вимкнені
// навмисно: інакше supabase-js за замовчуванням підхоплює будь-яку
// збережену в localStorage сесію користувача (напр. з coffee-one-web,
// якщо обидва застосунки колись відкривались з того самого origin/порту)
// і використовує ЇЇ токен замість service-role ключа — тоді запити
// виконуються від імені звичайного юзера й впираються в RLS.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});