// Push-сповіщення з IT Дашборда (нова задача / призначено відповідального /
// потрібне погодження кошторису / задача завершена). admin_user_ids: null
// означає "усім підписаним" (наразі лише для "задача завершена").
export async function notifyItDashboard(title: string, body: string, admin_user_ids: string[] | null) {
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/it-task-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY}` },
      body: JSON.stringify({ title, body, url: '/it-dashboard', admin_user_ids }),
    });
  } catch {
    // push не критичний для флоу — не блокуємо UI
  }
}

export const YURII_EMAIL = 'yurii@coffeeoneadmin.com';
