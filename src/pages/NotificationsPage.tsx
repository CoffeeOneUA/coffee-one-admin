import { useEffect, useMemo, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  target_user_id: string | null;
  target_screen: string | null;
  target_id: string | null;
  created_at: string;
}

interface Recipient {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

interface SearchItem {
  id: string;
  title: string;
}

type TriFilter = 'all' | 'yes' | 'no';

type DestType = 'none' | 'shop' | 'marketplace' | 'favorites' | 'cart' | 'trade_in' | 'warranty' | 'product' | 'listing';

const DEST_LABELS: Record<DestType, string> = {
  none: 'Без переходу',
  shop: 'Товари',
  marketplace: 'Маркетплейс',
  favorites: 'Обране',
  cart: 'Кошик',
  trade_in: 'Trade-IN калькулятор',
  warranty: 'Активація гарантії',
  product: 'Конкретний товар…',
  listing: 'Конкретне оголошення…',
};

const DEST_OPTIONS: DestType[] = ['none', 'shop', 'marketplace', 'favorites', 'cart', 'trade_in', 'warranty', 'product', 'listing'];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const [purchasedFilter, setPurchasedFilter] = useState<TriFilter>('all');
  const [warrantyFilter, setWarrantyFilter] = useState<TriFilter>('all');
  const [search, setSearch] = useState('');

  const [profiles, setProfiles] = useState<Recipient[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [warrantyIds, setWarrantyIds] = useState<Set<string>>(new Set());
  const [audienceLoading, setAudienceLoading] = useState(true);

  const [destType, setDestType] = useState<DestType>('none');
  const [destSearch, setDestSearch] = useState('');
  const [destResults, setDestResults] = useState<SearchItem[]>([]);
  const [destSelected, setDestSelected] = useState<SearchItem | null>(null);

  useEffect(() => {
    fetchNotifications();
    fetchAudienceData();
  }, []);

  useEffect(() => {
    setDestSelected(null);
    setDestSearch('');
    setDestResults([]);
  }, [destType]);

  useEffect(() => {
    if (destType !== 'product' && destType !== 'listing') return;
    const q = destSearch.trim();
    if (!q) {
      setDestResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const table = destType === 'product' ? 'products' : 'listings';
      const { data } = await supabase.from(table).select('id, title').ilike('title', `%${q}%`).limit(8);
      setDestResults(data ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [destSearch, destType]);

  async function fetchNotifications() {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setNotifications(data ?? []);
    setLoading(false);
  }

  async function fetchAudienceData() {
    setAudienceLoading(true);

    const [{ data: profileRows }, { data: orderRows }, { data: warrantyRows }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone'),
      supabase.from('orders').select('user_id'),
      supabase.from('warranties').select('user_id'),
    ]);

    // Email лежить тільки в auth.users, не в profiles — тягнемо окремо
    const emailById = new Map<string, string>();
    let page = 1;
    for (;;) {
      const { data: page1, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !page1?.users?.length) break;
      for (const u of page1.users) {
        if (u.email) emailById.set(u.id, u.email);
      }
      if (page1.users.length < 1000) break;
      page++;
    }

    setProfiles(
      (profileRows ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        email: emailById.get(p.id) ?? null,
      }))
    );
    setPurchasedIds(new Set((orderRows ?? []).map((o: any) => o.user_id)));
    setWarrantyIds(new Set((warrantyRows ?? []).map((w: any) => w.user_id)));
    setAudienceLoading(false);
  }

  const isBroadcast = purchasedFilter === 'all' && warrantyFilter === 'all' && !search.trim();

  const audience = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((p) => {
      if (purchasedFilter === 'yes' && !purchasedIds.has(p.id)) return false;
      if (purchasedFilter === 'no' && purchasedIds.has(p.id)) return false;
      if (warrantyFilter === 'yes' && !warrantyIds.has(p.id)) return false;
      if (warrantyFilter === 'no' && warrantyIds.has(p.id)) return false;
      if (q) {
        const phoneMatch = p.phone?.toLowerCase().includes(q);
        const emailMatch = p.email?.toLowerCase().includes(q);
        if (!phoneMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [profiles, purchasedIds, warrantyIds, purchasedFilter, warrantyFilter, search]);

  const needsDestSelection = (destType === 'product' || destType === 'listing') && !destSelected;

  async function handleSend() {
    if (!title.trim() || !body.trim()) return;
    if (!isBroadcast && audience.length === 0) return;
    if (needsDestSelection) return;

    setSending(true);
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        user_ids: isBroadcast ? null : audience.map((a) => a.id),
        target_screen: destType === 'none' ? null : destType,
        target_id: destType === 'product' || destType === 'listing' ? destSelected?.id ?? null : null,
      }),
    });

    if (res.ok) {
      setTitle('');
      setBody('');
      setPurchasedFilter('all');
      setWarrantyFilter('all');
      setSearch('');
      setDestType('none');
      fetchNotifications();
    }
    setSending(false);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  const filterBtnClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold border ${
      active ? 'bg-[#187FD8] text-white border-[#187FD8]' : 'bg-white text-[#546070] border-[#E8EDF4]'
    }`;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Сповіщення</h1>
        <p className="text-[#8893A2] mt-1">Push-розсилка всім користувачам або обраній аудиторії</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5 mb-6">
        <label className="block text-xs font-bold text-[#8893A2] uppercase tracking-widest mb-1.5">Заголовок</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Наприклад: Новинка в магазині"
          className="w-full border border-[#E8EDF4] rounded-xl px-3.5 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
        />
        <label className="block text-xs font-bold text-[#8893A2] uppercase tracking-widest mb-1.5">Текст</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Текст сповіщення…"
          className="w-full border border-[#E8EDF4] rounded-xl px-3.5 py-2.5 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-[#187FD8] resize-none"
        />

        <label className="block text-xs font-bold text-[#8893A2] uppercase tracking-widest mb-2">Аудиторія</label>
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          <span className="text-xs text-[#8893A2] font-semibold mr-1">Придбання:</span>
          <button className={filterBtnClass(purchasedFilter === 'all')} onClick={() => setPurchasedFilter('all')}>Усі</button>
          <button className={filterBtnClass(purchasedFilter === 'yes')} onClick={() => setPurchasedFilter('yes')}>Купували</button>
          <button className={filterBtnClass(purchasedFilter === 'no')} onClick={() => setPurchasedFilter('no')}>Не купували</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3.5">
          <span className="text-xs text-[#8893A2] font-semibold mr-1">Гарантія:</span>
          <button className={filterBtnClass(warrantyFilter === 'all')} onClick={() => setWarrantyFilter('all')}>Усі</button>
          <button className={filterBtnClass(warrantyFilter === 'yes')} onClick={() => setWarrantyFilter('yes')}>Активували</button>
          <button className={filterBtnClass(warrantyFilter === 'no')} onClick={() => setWarrantyFilter('no')}>Не активували</button>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Пошук за телефоном або email…"
          className="w-full border border-[#E8EDF4] rounded-xl px-3.5 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
        />

        <div className="text-xs text-[#546070] mb-5">
          {audienceLoading ? (
            'Рахуємо аудиторію…'
          ) : isBroadcast ? (
            <span>📣 Розсилка усім користувачам (включно з тими, хто зареєструється пізніше)</span>
          ) : (
            <span>Отримають сповіщення: <strong>{audience.length}</strong> користувачів{audience.length > 0 && audience.length <= 8 ? ` — ${audience.map((a) => a.full_name || a.phone || a.email).join(', ')}` : ''}</span>
          )}
        </div>

        <label className="block text-xs font-bold text-[#8893A2] uppercase tracking-widest mb-2">Куди веде сповіщення</label>
        <select
          value={destType}
          onChange={(e) => setDestType(e.target.value as DestType)}
          className="w-full border border-[#E8EDF4] rounded-xl px-3.5 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
        >
          {DEST_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{DEST_LABELS[opt]}</option>
          ))}
        </select>

        {(destType === 'product' || destType === 'listing') && (
          <div className="mb-4">
            {destSelected ? (
              <div className="flex items-center justify-between gap-3 border border-[#187FD8] bg-[#EAF3FC] rounded-xl px-3.5 py-2.5">
                <span className="text-sm font-semibold text-[#20303C]">{destSelected.title}</span>
                <button onClick={() => setDestSelected(null)} className="text-xs font-bold text-[#187FD8]">Змінити</button>
              </div>
            ) : (
              <>
                <input
                  value={destSearch}
                  onChange={(e) => setDestSearch(e.target.value)}
                  placeholder={destType === 'product' ? 'Пошук товару за назвою…' : 'Пошук оголошення за назвою…'}
                  className="w-full border border-[#E8EDF4] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
                />
                {destResults.length > 0 && (
                  <div className="mt-2 border border-[#E8EDF4] rounded-xl overflow-hidden">
                    {destResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setDestSelected(item)}
                        className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-[#F5F8FC] border-b border-[#E8EDF4] last:border-0"
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !body.trim() || (!isBroadcast && audience.length === 0) || needsDestSelection}
          className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
        >
          {sending ? 'Надсилання…' : isBroadcast ? '📣 Надіслати всім' : `📣 Надіслати (${audience.length})`}
        </button>
      </div>

      <h2 className="text-lg font-bold text-[#20303C] mb-3">Історія розсилок</h2>
      {loading ? (
        <div className="text-[#8893A2]">Завантаження…</div>
      ) : notifications.length === 0 ? (
        <div className="text-[#8893A2]">Ще нічого не надсилали</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden">
          {notifications.map((n, i) => (
            <div
              key={n.id}
              className={`p-4 ${i !== notifications.length - 1 ? 'border-b border-[#E8EDF4]' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-[#20303C]">{n.title}</div>
                  <div className="text-[#546070] text-sm mt-0.5">{n.body}</div>
                </div>
                <div className="text-[#8893A2] text-xs flex-shrink-0 text-right">
                  {formatDate(n.created_at)}
                  {n.target_user_id && <div className="mt-0.5">адресно</div>}
                  {n.target_screen && (
                    <div className="mt-0.5">→ {DEST_LABELS[n.target_screen as DestType] ?? n.target_screen}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
