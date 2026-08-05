import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  listings_count: number | null;
  is_blocked: boolean;
  blocked_at: string | null;
  created_at: string;
}

interface UserOrder {
  id: string;
  status: string;
  total_usd: number;
  total_uah: number;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
}

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

const inputClass = 'w-full border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]';

const EMPTY_FORM = {
  full_name: '',
  phone: '',
  city: '',
  avatar_url: '',
  rating: '',
  reviews_count: '',
  listings_count: '',
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'blocked'>('all');
  const [actionId, setActionId] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [orders, setOrders] = useState<UserOrder[] | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [noteSaving, setNoteSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone, city, avatar_url, rating, reviews_count, listings_count, is_blocked, blocked_at, created_at')
      .order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }

  async function toggleBlock(u: UserProfile) {
    setActionId(u.id);
    const next = !u.is_blocked;
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: next, blocked_at: next ? new Date().toISOString() : null })
      .eq('id', u.id);
    if (!error) {
      setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, is_blocked: next, blocked_at: next ? new Date().toISOString() : null } : p)));
    } else {
      alert(error.message);
    }
    setActionId(null);
  }

  function openEdit(u: UserProfile) {
    setEditingUser(u);
    setForm({
      full_name: u.full_name ?? '',
      phone: u.phone ?? '',
      city: u.city ?? '',
      avatar_url: u.avatar_url ?? '',
      rating: u.rating != null ? String(u.rating) : '',
      reviews_count: u.reviews_count != null ? String(u.reviews_count) : '',
      listings_count: u.listings_count != null ? String(u.listings_count) : '',
    });
    setOrders(null);
    setNoteDrafts({});
    fetchOrders(u.id);
  }

  async function fetchOrders(userId: string) {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total_usd, total_uah, notes, admin_notes, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error) {
      setOrders(data ?? []);
      const drafts: Record<string, string> = {};
      for (const o of data ?? []) drafts[o.id] = o.admin_notes ?? '';
      setNoteDrafts(drafts);
    }
    setOrdersLoading(false);
  }

  function closeEdit() {
    if (saving) return;
    setEditingUser(null);
  }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveProfile() {
    if (!editingUser) return;
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim() || null,
      phone: form.phone.trim() || null,
      city: form.city.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      rating: form.rating === '' ? null : Number(form.rating),
      reviews_count: form.reviews_count === '' ? null : Number(form.reviews_count),
      listings_count: form.listings_count === '' ? null : Number(form.listings_count),
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', editingUser.id);
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...payload } : u)));
    setEditingUser(null);
  }

  async function saveNote(orderId: string) {
    setNoteSaving(orderId);
    const text = noteDrafts[orderId]?.trim() || null;
    const { error } = await supabase.from('orders').update({ admin_notes: text }).eq('id', orderId);
    setNoteSaving(null);
    if (error) {
      alert(error.message);
      return;
    }
    setOrders((prev) => prev?.map((o) => (o.id === orderId ? { ...o, admin_notes: text } : o)) ?? null);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const filtered = filter === 'blocked' ? users.filter((u) => u.is_blocked) : users;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Користувачі</h1>
        <p className="text-[#8893A2] mt-1">
          Продавців з рейтингом нижче 4.0 (від 3 оцінок) блокує автоматично. Тут можна розблокувати вручну або
          заблокувати самостійно, редагувати дані клієнта та лишати примітки до його замовлень.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${filter === 'all' ? 'bg-[#20303C] text-white shadow-lg' : 'bg-white text-[#8893A2] hover:bg-gray-50 border border-[#E8EDF4]'}`}
        >
          Усі
        </button>
        <button
          onClick={() => setFilter('blocked')}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${filter === 'blocked' ? 'bg-[#20303C] text-white shadow-lg' : 'bg-white text-[#8893A2] hover:bg-gray-50 border border-[#E8EDF4]'}`}
        >
          Заблоковані{users.filter((u) => u.is_blocked).length > 0 ? ` (${users.filter((u) => u.is_blocked).length})` : ''}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#8893A2] font-medium">Завантаження…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-5xl mb-3">👥</div>
            <div className="text-xl font-bold text-[#20303C] mb-2">{filter === 'blocked' ? 'Заблокованих немає' : 'Користувачів немає'}</div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden">
          {filtered.map((u, i) => (
            <div key={u.id} className={`p-5 flex items-center justify-between gap-4 ${i !== filtered.length - 1 ? 'border-b border-[#E8EDF4]' : ''}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[#20303C]">{u.full_name || 'Без імені'}</span>
                  {u.is_blocked && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Заблоковано</span>
                  )}
                  {u.reviews_count ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      ★ {Number(u.rating).toFixed(1)} ({u.reviews_count})
                    </span>
                  ) : null}
                </div>
                <div className="text-[#546070] text-sm">{u.phone || '—'} {u.city ? `· ${u.city}` : ''}</div>
                <div className="text-[#8893A2] text-xs mt-1">
                  На платформі з {formatDate(u.created_at)}
                  {u.is_blocked && u.blocked_at ? ` · Заблоковано ${formatDate(u.blocked_at)}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(u)}
                  className="font-bold px-4 py-2.5 rounded-xl text-sm bg-[#F1F5FB] hover:bg-[#e4ebf5] text-[#546070] transition-all"
                >
                  ✏️ Редагувати
                </button>
                <button
                  onClick={() => toggleBlock(u)}
                  disabled={actionId === u.id}
                  className={`font-bold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 ${
                    u.is_blocked
                      ? 'bg-[#EAF2FC] hover:bg-[#dbe9fa] text-[#187FD8]'
                      : 'bg-red-50 hover:bg-red-100 text-red-500 border border-red-200'
                  }`}
                >
                  {actionId === u.id ? '…' : u.is_blocked ? 'Розблокувати' : 'Заблокувати'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeEdit}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold text-[#20303C] mb-1">Клієнт: {editingUser.full_name || 'Без імені'}</h2>
            <p className="text-[#8893A2] text-xs mb-5">На платформі з {formatDate(editingUser.created_at)}</p>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Ім'я</label>
                  <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Телефон</label>
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Місто</label>
                <input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Аватар (URL)</label>
                <div className="flex items-center gap-3">
                  {form.avatar_url && (
                    <img src={form.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-[#E8EDF4] flex-shrink-0" />
                  )}
                  <input value={form.avatar_url} onChange={(e) => set('avatar_url', e.target.value)} className={inputClass} placeholder="https://…" />
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-[#546070] mb-1.5">Рейтинг та лічильники</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-[#8893A2] mb-1 block">Рейтинг</label>
                    <input value={form.rating} onChange={(e) => set('rating', e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8893A2] mb-1 block">Кількість відгуків</label>
                    <input value={form.reviews_count} onChange={(e) => set('reviews_count', e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8893A2] mb-1 block">Кількість оголошень</label>
                    <input value={form.listings_count} onChange={(e) => set('listings_count', e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputClass} />
                  </div>
                </div>
                <p className="text-[#8893A2] text-xs mt-1.5">
                  Якщо ці значення десь автоматично перераховуються (напр. після нового відгуку чи оголошення), ручна правка тут перезапишеться наступним перерахунком.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={closeEdit} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#F1F5FB] text-[#546070] hover:bg-[#e4ebf5]">
                Скасувати
              </button>
              <button onClick={handleSaveProfile} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50">
                {saving ? 'Зберігаємо…' : 'Зберегти'}
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-[#E8EDF4]">
              <h3 className="text-base font-bold text-[#20303C] mb-3">Замовлення клієнта</h3>
              {ordersLoading ? (
                <div className="text-[#8893A2] text-sm">Завантаження…</div>
              ) : !orders || orders.length === 0 ? (
                <div className="text-[#8893A2] text-sm">У цього клієнта ще немає замовлень</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {orders.map((o) => (
                    <div key={o.id} className="bg-[#F8FAFC] rounded-xl p-3.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ORDER_STATUS_COLOR[o.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </span>
                        <span className="text-[#8893A2] text-xs">{formatDateTime(o.created_at)}</span>
                      </div>
                      <div className="text-sm font-bold text-[#20303C] mb-2">
                        ${Number(o.total_usd).toLocaleString()} <span className="text-[#8893A2] font-normal">≈ {Number(o.total_uah).toLocaleString()} ₴</span>
                      </div>
                      {o.notes && (
                        <div className="text-[#546070] text-xs italic mb-2">Коментар клієнта: "{o.notes}"</div>
                      )}
                      <label className="text-[10px] font-bold text-[#8893A2] uppercase tracking-wide mb-1 block">Примітка менеджера</label>
                      <textarea
                        value={noteDrafts[o.id] ?? ''}
                        onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [o.id]: e.target.value }))}
                        rows={2}
                        placeholder="Внутрішня примітка — клієнт її не бачить"
                        className="w-full border border-[#E8EDF4] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#187FD8] resize-none"
                      />
                      {(noteDrafts[o.id] ?? '') !== (o.admin_notes ?? '') && (
                        <button
                          onClick={() => saveNote(o.id)}
                          disabled={noteSaving === o.id}
                          className="mt-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
                        >
                          {noteSaving === o.id ? 'Зберігаємо…' : 'Зберегти примітку'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
