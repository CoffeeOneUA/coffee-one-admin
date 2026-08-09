import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

// Клієнт для входу в адмінку (lib/auth.tsx логінить адміна через
// supabase.auth.signInWithPassword) — сесія МАЄ зберігатись, інакше кожне
// оновлення сторінки викидає на /login, навіть якщо адмін щойно увійшов.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true },
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