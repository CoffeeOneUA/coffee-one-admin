import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface Stats {
  products: number;
  outOfStock: number;
  listings: number;
  pending: number;
  rejected: number;
  sold: number;
  users: number;
  newUsersWeek: number;
  newLeads: number;
  monthRevenue: number;
  activeListingsValue: number;
}

interface PendingListing {
  id: string;
  title: string;
  city: string;
  price_uah: number;
  created_at: string;
}

interface NewLead {
  id: string;
  type: string;
  name: string;
  phone: string;
  created_at: string;
}

interface RecentOrder {
  id: string;
  status: string;
  total_uah: number;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

interface CityCount {
  name: string;
  count: number;
}

const LEAD_TYPE_LABEL: Record<string, string> = {
  grant: 'Гранти і лізинг',
  trade_in: 'Trade-IN',
  service: 'Сервіс',
  question: 'Питання про товар',
  credit: 'Кредит та розстрочка',
  turnkey: 'Кав\'ярня «під ключ»',
  partnership: 'Партнерство',
  service_center: 'Сервісний центр',
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Очікує оплати',
  processing: 'В обробці',
  paid: 'Оплачено',
  shipped: 'Відправлено',
  completed: 'Виконано',
  cancelled: 'Скасовано',
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  shipped: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-700',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'щойно';
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн тому`;
  return formatDate(dateStr);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    products: 0,
    outOfStock: 0,
    listings: 0,
    pending: 0,
    rejected: 0,
    sold: 0,
    users: 0,
    newUsersWeek: 0,
    newLeads: 0,
    monthRevenue: 0,
    activeListingsValue: 0,
  });
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [newLeadsList, setNewLeadsList] = useState<NewLead[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topCities, setTopCities] = useState<CityCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      products,
      outOfStock,
      listings,
      pending,
      rejected,
      sold,
      users,
      newUsersWeek,
      newLeadsCount,
      monthOrders,
      activeListings,
      pendingListingsRes,
      newLeadsRes,
      recentOrdersRes,
    ] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('in_stock', false),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'sold'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('orders').select('total_uah, status').gte('created_at', monthStart.toISOString()).in('status', ['paid', 'shipped', 'completed']),
      supabase.from('listings').select('price_uah, city').eq('status', 'approved'),
      supabase.from('listings').select('id, title, city, price_uah, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
      supabase.from('leads').select('id, type, name, phone, created_at').eq('status', 'new').order('created_at', { ascending: false }).limit(5),
      supabase.from('orders').select('id, status, total_uah, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(5),
    ]);

    const monthRevenue = (monthOrders.data ?? []).reduce((sum, o) => sum + Number(o.total_uah ?? 0), 0);
    const activeListingsValue = (activeListings.data ?? []).reduce((sum, l) => sum + Number(l.price_uah ?? 0), 0);

    const cityCounts = new Map<string, number>();
    for (const l of activeListings.data ?? []) {
      if (!l.city) continue;
      cityCounts.set(l.city, (cityCounts.get(l.city) ?? 0) + 1);
    }
    const cities = Array.from(cityCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({
      products: products.count ?? 0,
      outOfStock: outOfStock.count ?? 0,
      listings: listings.count ?? 0,
      pending: pending.count ?? 0,
      rejected: rejected.count ?? 0,
      sold: sold.count ?? 0,
      users: users.count ?? 0,
      newUsersWeek: newUsersWeek.count ?? 0,
      newLeads: newLeadsCount.count ?? 0,
      monthRevenue,
      activeListingsValue,
    });
    setPendingListings((pendingListingsRes.data as PendingListing[]) ?? []);
    setNewLeadsList((newLeadsRes.data as NewLead[]) ?? []);
    setRecentOrders((recentOrdersRes.data as unknown as RecentOrder[]) ?? []);
    setTopCities(cities);
    setLoading(false);
  }

  const STAT_CARDS = [
    { icon: '🛍', label: 'Товарів у магазині', value: stats.products, color: 'bg-blue-50 text-blue-600' },
    { icon: '🔍', label: 'Активних оголошень', value: stats.listings, color: 'bg-green-50 text-green-600' },
    { icon: '⏳', label: 'На модерації', value: stats.pending, color: 'bg-amber-50 text-amber-600' },
    { icon: '👥', label: 'Користувачів', value: stats.users, color: 'bg-purple-50 text-purple-600' },
    { icon: '💰', label: 'Дохід за місяць', value: `${stats.monthRevenue.toLocaleString('uk-UA')} ₴`, color: 'bg-teal-50 text-teal-600' },
    { icon: '📩', label: 'Нові заявки', value: stats.newLeads, color: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Дашборд</h1>
        <p className="text-[#8893A2] mt-1">Огляд стану Coffee One</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
        {STAT_CARDS.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 border border-[#E8EDF4] shadow-sm">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4 ${card.color}`}>
              {card.icon}
            </div>
            <div className="text-2xl font-extrabold text-[#20303C] mb-1">
              {loading ? '—' : card.value}
            </div>
            <div className="text-[#8893A2] text-sm font-medium">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#20303C]">Оголошення на модерації</h2>
              <a href="/moderation" className="text-[#187FD8] text-sm font-bold hover:underline">Усі →</a>
            </div>
            {!loading && pendingListings.length === 0 ? (
              <p className="text-[#8893A2] text-sm">Немає оголошень, що очікують перевірки 🎉</p>
            ) : (
              <div className="flex flex-col gap-1">
                {pendingListings.map((l) => (
                  <a key={l.id} href="/moderation" className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F1F4F8] last:border-0 hover:bg-[#F8FAFC] rounded-lg px-2 -mx-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#20303C] text-sm truncate">{l.title}</div>
                      <div className="text-[#8893A2] text-xs">📍 {l.city} · {timeAgo(l.created_at)}</div>
                    </div>
                    <div className="font-bold text-[#20303C] text-sm shrink-0">{Number(l.price_uah).toLocaleString('uk-UA')} ₴</div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#20303C]">Нові заявки</h2>
              <a href="/leads" className="text-[#187FD8] text-sm font-bold hover:underline">Усі →</a>
            </div>
            {!loading && newLeadsList.length === 0 ? (
              <p className="text-[#8893A2] text-sm">Нових заявок немає</p>
            ) : (
              <div className="flex flex-col gap-1">
                {newLeadsList.map((lead) => (
                  <a key={lead.id} href="/leads" className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F1F4F8] last:border-0 hover:bg-[#F8FAFC] rounded-lg px-2 -mx-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#20303C] text-sm truncate">{lead.name}</div>
                      <div className="text-[#8893A2] text-xs">{LEAD_TYPE_LABEL[lead.type] ?? lead.type} · {lead.phone}</div>
                    </div>
                    <div className="text-[#8893A2] text-xs shrink-0">{timeAgo(lead.created_at)}</div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#20303C]">Останні замовлення</h2>
              <a href="/orders" className="text-[#187FD8] text-sm font-bold hover:underline">Усі →</a>
            </div>
            {!loading && recentOrders.length === 0 ? (
              <p className="text-[#8893A2] text-sm">Замовлень ще не було</p>
            ) : (
              <div className="flex flex-col gap-1">
                {recentOrders.map((o) => (
                  <a key={o.id} href="/orders" className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F1F4F8] last:border-0 hover:bg-[#F8FAFC] rounded-lg px-2 -mx-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#20303C] text-sm truncate">{o.profiles?.full_name ?? 'Без імені'}</div>
                      <div className="text-[#8893A2] text-xs">{timeAgo(o.created_at)}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${ORDER_STATUS_COLOR[o.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {ORDER_STATUS_LABEL[o.status] ?? o.status}
                      </span>
                      <span className="font-bold text-[#20303C] text-sm">{Number(o.total_uah).toLocaleString('uk-UA')} ₴</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#20303C] mb-4">Оголошення за статусом</h2>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Активні', value: stats.listings, color: 'bg-green-500' },
                { label: 'На модерації', value: stats.pending, color: 'bg-amber-500' },
                { label: 'Продані', value: stats.sold, color: 'bg-gray-400' },
                { label: 'Відхилені', value: stats.rejected, color: 'bg-red-500' },
              ].map((row) => {
                const total = stats.listings + stats.pending + stats.sold + stats.rejected;
                const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[#20303C] font-medium">{row.label}</span>
                      <span className="text-[#8893A2] font-semibold">{row.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#F1F4F8] overflow-hidden">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-[#F1F4F8] text-sm">
              <span className="text-[#8893A2]">Сумарна вартість активних: </span>
              <span className="font-bold text-[#20303C]">{stats.activeListingsValue.toLocaleString('uk-UA')} ₴</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#20303C] mb-4">Топ міста за оголошеннями</h2>
            {!loading && topCities.length === 0 ? (
              <p className="text-[#8893A2] text-sm">Немає даних</p>
            ) : (
              <div className="flex flex-col gap-2">
                {topCities.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span className="text-[#20303C] font-medium">{i + 1}. {c.name}</span>
                    <span className="text-[#8893A2] font-semibold">{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#20303C] mb-1">За тиждень</h2>
            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="text-[#8893A2]">Нових користувачів</span>
              <span className="font-bold text-[#20303C]">{stats.newUsersWeek}</span>
            </div>
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-[#8893A2]">Товарів немає в наявності</span>
              <a href="/products" className="font-bold text-[#20303C] hover:underline">{stats.outOfStock}</a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#20303C] mb-4">Швидкі дії</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <a href="/moderation" className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-all">
            <span className="text-2xl">🛡</span>
            <div>
              <div className="font-bold text-[#20303C]">Модерація</div>
              <div className="text-[#8893A2] text-sm">{stats.pending} чекають</div>
            </div>
          </a>
          <a href="/leads" className="flex items-center gap-3 p-4 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all">
            <span className="text-2xl">📩</span>
            <div>
              <div className="font-bold text-[#20303C]">Заявки</div>
              <div className="text-[#8893A2] text-sm">{stats.newLeads} нових</div>
            </div>
          </a>
          <a href="/orders" className="flex items-center gap-3 p-4 bg-teal-50 rounded-xl hover:bg-teal-100 transition-all">
            <span className="text-2xl">🧾</span>
            <div>
              <div className="font-bold text-[#20303C]">Замовлення</div>
              <div className="text-[#8893A2] text-sm">Керувати</div>
            </div>
          </a>
          <a href="/products" className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all">
            <span className="text-2xl">🛍</span>
            <div>
              <div className="font-bold text-[#20303C]">Товари</div>
              <div className="text-[#8893A2] text-sm">Керувати каталогом</div>
            </div>
          </a>
          <a href="/listings" className="flex items-center gap-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-all">
            <span className="text-2xl">🔍</span>
            <div>
              <div className="font-bold text-[#20303C]">Оголошення</div>
              <div className="text-[#8893A2] text-sm">{stats.listings} активних</div>
            </div>
          </a>
          <a href="/users" className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-all">
            <span className="text-2xl">👥</span>
            <div>
              <div className="font-bold text-[#20303C]">Користувачі</div>
              <div className="text-[#8893A2] text-sm">{stats.users} зареєстровано</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
