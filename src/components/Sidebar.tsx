import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { useAuth, type AdminRole } from '../lib/auth';
import logo from '../assets/coffeeone-logo.png';

const ROLE_LABEL: Record<AdminRole, string> = {
  superadmin: 'Суперадмін',
  admin: 'Адмін',
  moderator: 'Модератор',
};

const NAV_ITEMS = [
  { path: '/', icon: '📊', label: 'Дашборд' },
  { path: '/moderation', icon: '🛡', label: 'Модерація', badge: true },
  { path: '/content', icon: '📝', label: 'Контент' },
  { path: '/cities', icon: '📍', label: 'Міста' },
  { path: '/leads', icon: '📞', label: 'Заявки' },
  { path: '/warranties', icon: '🛡', label: 'Гарантії' },
  { path: '/maintenance', icon: '🔧', label: 'ТО' },
  { path: '/notifications', icon: '🔔', label: 'Сповіщення' },
  { path: '/filters', icon: '⚙', label: 'Фільтри' },
  { path: '/categories', icon: '🗂', label: 'Категорії' },
  { path: '/brands', icon: '🏷', label: 'Бренди' },
  { path: '/models', icon: '⚙', label: 'Моделі' },
  { path: '/listings', icon: '🔍', label: 'Оголошення' },
  { path: '/products', icon: '🛍', label: 'Товари' },
  { path: '/bloggers', icon: '🎥', label: 'Блогери' },
  { path: '/orders', icon: '📦', label: 'Замовлення' },
  { path: '/payment-settings', icon: '💳', label: 'Оплата' },
  { path: '/support', icon: '🎧', label: 'Підтримка' },
  { path: '/service-centers', icon: '🧰', label: 'Сервісні центри' },
  { path: '/deals', icon: '🤝', label: 'Угоди' },
  { path: '/users', icon: '👥', label: 'Користувачі' },
  { path: '/site-settings', icon: '🌐', label: 'Сайт' },
];

// Живий лічильник нових заявок на ТО + браузерне сповіщення (Notification
// API), поки вкладка адмінки відкрита — у веб-панелі немає push-каналу,
// тож це найближчий практичний еквівалент "пуш сповіщення в адмін панель".
function useMaintenanceBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchCount() {
      const { count: c } = await supabase
        .from('maintenance_records')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ordered');
      if (mounted) setCount(c ?? 0);
    }
    fetchCount();

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const channel = supabase
      .channel('maintenance_records_admin_badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_records' },
        (payload: any) => {
          fetchCount();
          const becameOrdered = payload.eventType === 'INSERT'
            ? payload.new?.status === 'ordered'
            : payload.eventType === 'UPDATE' && payload.new?.status === 'ordered' && payload.old?.status !== 'ordered';
          if (becameOrdered && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Нова заявка на ТО', {
              body: `${payload.new?.equipment_name ?? 'Обладнання'} — очікує на обробку`,
            });
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}

export default function Sidebar() {
  const maintenanceBadge = useMaintenanceBadge();
  const { admin, signOut } = useAuth();

  const navItems =
    admin?.role === 'superadmin'
      ? [...NAV_ITEMS, { path: '/admin-users', icon: '🔑', label: 'Доступи' }]
      : NAV_ITEMS;

  return (
    <aside className="w-60 bg-[#20303C] h-screen flex flex-col fixed left-0 top-0 z-50">
      {/* Лого */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Coffee One" className="h-9 w-auto" />
          <div className="text-white/40 text-xs">Admin Panel</div>
        </div>
      </div>

      {/* Навігація */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="text-white/30 text-xs font-bold uppercase tracking-widest px-2 mb-3">
          Головне
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#187FD8] text-white'
                  : 'text-white/55 hover:bg-white/8 hover:text-white/85'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                !
              </span>
            )}
            {item.path === '/maintenance' && maintenanceBadge > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {maintenanceBadge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Користувач */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl group">
          <div className="w-8 h-8 rounded-full bg-[#187FD8] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(admin?.full_name || admin?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-sm font-semibold truncate">{admin?.full_name || admin?.email || '—'}</div>
            <div className="text-white/40 text-xs">{admin ? ROLE_LABEL[admin.role] : ''}</div>
          </div>
          <button
            onClick={() => signOut()}
            title="Вийти"
            className="text-white/40 hover:text-white text-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}
