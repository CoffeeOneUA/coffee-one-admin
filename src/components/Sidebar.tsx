import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { useAuth, type AdminRole } from '../lib/auth';
import { Icon, type IconName } from './Icon';
import logo from '../assets/coffeeone-logo.png';

const ROLE_LABEL: Record<AdminRole, string> = {
  superadmin: 'Суперадмін',
  admin: 'Адмін',
  moderator: 'Модератор',
};

interface NavItem {
  path: string;
  icon: IconName;
  label: string;
  badge?: boolean;
}

// Ті самі 24 пункти й маршрути, що були — лише згруповані за змістом
// замість суцільного списку, і з графічними іконками замість emoji.
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Загальне',
    items: [{ path: '/', icon: 'dashboard', label: 'Дашборд' }],
  },
  {
    label: 'Контент і довідники',
    items: [
      { path: '/moderation', icon: 'shield', label: 'Модерація', badge: true },
      { path: '/content', icon: 'document', label: 'Контент' },
      { path: '/cities', icon: 'pin', label: 'Міста' },
      { path: '/categories', icon: 'grid', label: 'Категорії' },
      { path: '/brands', icon: 'tag', label: 'Бренди' },
      { path: '/models', icon: 'box', label: 'Моделі' },
      { path: '/filters', icon: 'sliders', label: 'Фільтри' },
    ],
  },
  {
    label: 'Каталог і продажі',
    items: [
      { path: '/products', icon: 'bag', label: 'Товари' },
      { path: '/listings', icon: 'storefront', label: 'Оголошення' },
      { path: '/bulk-import', icon: 'uploadTray', label: 'Масовий імпорт' },
      { path: '/orders', icon: 'package', label: 'Замовлення' },
      { path: '/bloggers', icon: 'video', label: 'Блогери' },
    ],
  },
  {
    label: 'Клієнти та сервіс',
    items: [
      { path: '/users', icon: 'users', label: 'Користувачі' },
      { path: '/leads', icon: 'phone', label: 'Заявки' },
      { path: '/deals', icon: 'repeat', label: 'Угоди' },
      { path: '/warranties', icon: 'shieldCheck', label: 'Гарантії' },
      { path: '/maintenance', icon: 'wrench', label: 'ТО' },
      { path: '/service-centers', icon: 'toolbox', label: 'Сервісні центри' },
      { path: '/support', icon: 'headset', label: 'Підтримка' },
    ],
  },
  {
    label: 'Система',
    items: [
      { path: '/notifications', icon: 'bell', label: 'Сповіщення' },
      { path: '/payment-settings', icon: 'creditCard', label: 'Оплата' },
      { path: '/site-settings', icon: 'globe', label: 'Сайт' },
      { path: '/app-version', icon: 'smartphone', label: 'Версія застосунку' },
      { path: '/it-dashboard', icon: 'clipboard', label: 'IT Дашборд' },
    ],
  },
];

// Живий лічильник нових заявок на ТО + браузерне сповіщення (Notification
// API), поки вкладка адмінки відкрита — у веб-панелі немає push-каналу,
// тож це найближчий практичний еквівалент "пуш сповіщення в адмін панель".
function useMaintenanceBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchCount() {
      const [{ count: ordered }, { count: unscheduled }] = await Promise.all([
        supabase.from('maintenance_records').select('id', { count: 'exact', head: true }).eq('status', 'ordered'),
        supabase.from('unscheduled_maintenance_requests').select('id', { count: 'exact', head: true }).eq('status', 'requested'),
      ]);
      if (mounted) setCount((ordered ?? 0) + (unscheduled ?? 0));
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

    const unscheduledChannel = supabase
      .channel('unscheduled_maintenance_admin_badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'unscheduled_maintenance_requests' },
        (payload: any) => {
          fetchCount();
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Заявка на позапланове ТО', {
              body: `${payload.new?.equipment_name ?? 'Обладнання'} — очікує на обробку`,
            });
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      supabase.removeChannel(unscheduledChannel);
    };
  }, []);

  return count;
}

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const maintenanceBadge = useMaintenanceBadge();
  const { admin, signOut } = useAuth();

  const groups =
    admin?.role === 'superadmin'
      ? NAV_GROUPS.map((g) =>
          g.label === 'Система'
            ? { ...g, items: [...g.items, { path: '/admin-users', icon: 'key' as IconName, label: 'Доступи' }] }
            : g
        )
      : NAV_GROUPS;

  return (
    <>
      {/* Затемнення позаду висувного меню — лише на мобільних, клік закриває */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 bg-[#20303C] h-screen flex flex-col fixed left-0 top-0 z-50 transition-transform duration-200 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Лого */}
        <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Coffee One" className="h-9 w-auto" />
            <div className="text-white/40 text-xs">Admin Panel</div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-white/60 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
            aria-label="Закрити меню"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Навігація */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="text-white/30 text-[10.5px] font-extrabold uppercase tracking-widest px-2 mt-4 mb-2 first:mt-0">
                {group.label}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-[#187FD8] text-white'
                        : 'text-white/55 hover:bg-white/8 hover:text-white/85'
                    }`
                  }
                >
                  <Icon name={item.icon} size={17} />
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
            </div>
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
              className="text-white/40 hover:text-white shrink-0 opacity-70 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
            >
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
