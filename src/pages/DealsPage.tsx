import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface Deal {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount_uah: number | null;
  status: 'pending' | 'completed';
  completed_at: string | null;
  created_at: string;
  listings: { title: string; safe_payment_enabled: boolean } | null;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase
      .from('deals')
      .select('*, listings(title, safe_payment_enabled)')
      .order('created_at', { ascending: false });
    const rows = data ?? [];
    setDeals(rows);

    const ids = Array.from(new Set(rows.flatMap((d) => [d.buyer_id, d.seller_id])));
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      const map: Record<string, string> = {};
      (profiles ?? []).forEach((p) => { map[p.id] = p.full_name || 'Без імені'; });
      setNames(map);
    }
    setLoading(false);
  }

  async function handleComplete(dealId: string) {
    if (!confirm('Підтвердити завершення угоди? Продавцю й покупцю прийде push-сповіщення, покупця попросять оцінити продавця.')) return;
    setConfirmingId(dealId);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-deal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ deal_id: dealId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Помилка');
      await fetchAll();
    } catch (e: any) {
      alert(e.message ?? 'Не вдалося підтвердити угоду');
    } finally {
      setConfirmingId(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  const filtered = deals.filter((d) => d.status === tab);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Угоди</h1>
        <p className="text-[#8893A2] mt-1">
          Створюються автоматично, коли в чаті приймається пропозиція ціни. Підтвердіть тут, коли гроші отримано
          продавцем і товар забрано покупцем — це нарахує обом push і попросить покупця оцінити продавця.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {(['pending', 'completed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              tab === t ? 'bg-[#20303C] text-white shadow-lg' : 'bg-white text-[#8893A2] hover:bg-gray-50 border border-[#E8EDF4]'
            }`}
          >
            {t === 'pending' ? 'Очікують підтвердження' : 'Завершені'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#8893A2] font-medium">Завантаження…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-5xl mb-3">🤝</div>
            <div className="text-xl font-bold text-[#20303C] mb-2">Угод немає</div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden">
          {filtered.map((d, i) => (
            <div key={d.id} className={`p-5 flex items-center justify-between gap-4 ${i !== filtered.length - 1 ? 'border-b border-[#E8EDF4]' : ''}`}>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-[#20303C]">{d.listings?.title ?? 'Оголошення видалено'}</span>
                  {d.listings?.safe_payment_enabled && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">🔒 Безпечна оплата</span>
                  )}
                </div>
                <div className="text-[#546070] text-sm mt-0.5">
                  Продавець: {names[d.seller_id] ?? d.seller_id} · Покупець: {names[d.buyer_id] ?? d.buyer_id}
                </div>
                <div className="text-[#8893A2] text-xs mt-1">
                  {d.amount_uah ? `${Number(d.amount_uah).toLocaleString('uk-UA')} ₴ · ` : ''}
                  {d.status === 'completed' && d.completed_at ? `Завершено ${formatDate(d.completed_at)}` : `Створено ${formatDate(d.created_at)}`}
                </div>
              </div>
              {d.status === 'pending' && (
                <button
                  onClick={() => handleComplete(d.id)}
                  disabled={confirmingId === d.id}
                  className="bg-[#187FD8] hover:bg-[#1169B8] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 flex-shrink-0"
                >
                  {confirmingId === d.id ? 'Підтвердження…' : 'Підтвердити завершення'}
                </button>
              )}
              {d.status === 'completed' && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">Завершено</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
