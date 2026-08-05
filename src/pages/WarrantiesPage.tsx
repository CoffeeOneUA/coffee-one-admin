import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface Warranty {
  id: string;
  doc_id: string;
  member_id: string | null;
  client_id: string | null;
  client_name: string;
  client_phone: string;
  machine_id: string | null;
  goods: string | null;
  warranty_raw: string | null;
  invoice_date: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  status: 'active' | 'expired' | 'renewed';
  activated_at: string;
  source: 'qr_1c' | 'invoice_photo' | 'invoice_pdf' | null;
}

const SOURCE_LABEL: Record<string, string> = {
  qr_1c: 'QR / 1С',
  invoice_photo: 'Фото накладної (ШІ)',
  invoice_pdf: 'PDF накладної (ШІ)',
};

const STATUS_LABEL: Record<Warranty['status'], string> = {
  active: 'Активна',
  expired: 'Закінчилась',
  renewed: 'Продовжена',
};

const STATUS_COLOR: Record<Warranty['status'], string> = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  renewed: 'bg-blue-100 text-blue-700',
};

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchWarranties();
  }, []);

  async function fetchWarranties() {
    setLoading(true);
    const { data, error } = await supabase
      .from('warranties')
      .select('*')
      .order('activated_at', { ascending: false });

    if (!error) setWarranties(data ?? []);
    setLoading(false);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const normalizedSearch = search.trim().toLowerCase();
  const searchDigits = search.replace(/\D/g, '');
  const filtered = !normalizedSearch
    ? warranties
    : warranties.filter((w) => {
        const nameMatch = w.client_name?.toLowerCase().includes(normalizedSearch);
        const phoneMatch = searchDigits && w.client_phone?.replace(/\D/g, '').includes(searchDigits);
        return nameMatch || phoneMatch;
      });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Гарантії</h1>
        <p className="text-[#8893A2] mt-1">Активовані гарантії через сканування QR у застосунку</p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative max-w-md w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8893A2]">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за прізвищем або номером телефону…"
            className="w-full border border-[#E8EDF4] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
          />
        </div>
        {normalizedSearch && (
          <span className="text-[#8893A2] text-sm font-medium shrink-0">Знайдено: {filtered.length}</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#8893A2] font-medium">Завантаження…</div>
        </div>
      ) : warranties.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-5xl mb-3">🛡</div>
            <div className="text-xl font-bold text-[#20303C] mb-2">Гарантій ще немає</div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-5xl mb-3">🔍</div>
            <div className="text-xl font-bold text-[#20303C] mb-2">Нічого не знайдено</div>
            <div className="text-[#8893A2] text-sm">Спробуйте інше прізвище або номер телефону</div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#8893A2] text-xs uppercase tracking-widest border-b border-[#E8EDF4]">
                <th className="px-5 py-3 font-bold">Клієнт</th>
                <th className="px-5 py-3 font-bold">Обладнання</th>
                <th className="px-5 py-3 font-bold">Активовано</th>
                <th className="px-5 py-3 font-bold">Старт гарантії</th>
                <th className="px-5 py-3 font-bold">Закінчення</th>
                <th className="px-5 py-3 font-bold">Статус</th>
                <th className="px-5 py-3 font-bold">Джерело</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="border-b border-[#E8EDF4] last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[#20303C]">{w.client_name}</div>
                    <div className="text-[#8893A2] text-xs">{w.client_phone}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[#20303C]">{w.goods ?? '—'}</div>
                    <div className="text-[#8893A2] text-xs">ID машини: {w.machine_id ?? '—'}</div>
                  </td>
                  <td className="px-5 py-4 text-[#546070]">{formatDate(w.activated_at)}</td>
                  <td className="px-5 py-4 text-[#546070]">
                    {formatDate(w.warranty_start_date)}
                    {w.invoice_date ? (
                      <div className="text-[#8893A2] text-xs mt-0.5">за датою накладної</div>
                    ) : (
                      <div className="text-[#8893A2] text-xs mt-0.5">за датою активації</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-[#546070]">
                    {formatDate(w.warranty_end_date)}
                    {!w.warranty_end_date && (
                      <div className="text-amber-600 text-xs font-semibold mt-0.5">
                        Формат "{w.warranty_raw}" не розпізнано
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[w.status]}`}>
                      {STATUS_LABEL[w.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#546070] text-xs">
                    {SOURCE_LABEL[w.source ?? 'qr_1c'] ?? w.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
