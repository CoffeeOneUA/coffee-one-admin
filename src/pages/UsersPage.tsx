import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  rating: number | null;
  reviews_count: number | null;
  is_blocked: boolean;
  blocked_at: string | null;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'blocked'>('all');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone, city, rating, reviews_count, is_blocked, blocked_at, created_at')
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

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const filtered = filter === 'blocked' ? users.filter((u) => u.is_blocked) : users;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Користувачі</h1>
        <p className="text-[#8893A2] mt-1">
          Продавців з рейтингом нижче 4.0 (від 3 оцінок) блокує автоматично. Тут можна розблокувати вручну або
          заблокувати самостійно.
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
              <button
                onClick={() => toggleBlock(u)}
                disabled={actionId === u.id}
                className={`font-bold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 flex-shrink-0 ${
                  u.is_blocked
                    ? 'bg-[#EAF2FC] hover:bg-[#dbe9fa] text-[#187FD8]'
                    : 'bg-red-50 hover:bg-red-100 text-red-500 border border-red-200'
                }`}
              >
                {actionId === u.id ? '…' : u.is_blocked ? 'Розблокувати' : 'Заблокувати'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
