import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface MaintenanceRecord {
  id: string;
  warranty_id: string;
  equipment_name: string | null;
  milestone: 3 | 6 | 12;
  due_date: string;
  status: 'due' | 'payment_pending' | 'ordered' | 'declined' | 'completed';
  price_uah: number;
  ordered_at: string | null;
  declined_at: string | null;
  completed_at: string | null;
  created_at: string;
  warranties: { client_name: string; client_phone: string } | null;
}

interface Settings {
  price_3m_uah: number;
  price_6m_uah: number;
  price_12m_uah: number;
}

const MILESTONE_LABEL: Record<number, string> = {
  3: 'Базове ТО (3 міс.)',
  6: 'Рекомендоване ТО (6 міс.)',
  12: 'Комплексне ТО (12 міс.)',
};

const STATUS_LABEL: Record<MaintenanceRecord['status'], string> = {
  due: 'Очікує рішення клієнта',
  payment_pending: 'Очікує оплати',
  ordered: 'Замовлено',
  declined: 'Відмовились',
  completed: 'Виконано',
};

const STATUS_COLOR: Record<MaintenanceRecord['status'], string> = {
  due: 'bg-amber-100 text-amber-700',
  payment_pending: 'bg-amber-100 text-amber-700',
  ordered: 'bg-blue-100 text-blue-700',
  declined: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
};

type FilterStatus = 'ordered' | 'due' | 'completed' | 'declined';

function Tab({ id, label, active, onClick, count }: { id: string; label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      key={id}
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
        active ? 'bg-[#20303C] text-white shadow-lg' : 'bg-white text-[#8893A2] hover:bg-gray-50 border border-[#E8EDF4]'
      }`}
    >
      {label}
      {active && !!count && (
        <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">{count}</span>
      )}
    </button>
  );
}

function RequestsTab() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('ordered');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [filter]);

  async function fetchRecords() {
    setLoading(true);
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*, warranties(client_name, client_phone)')
      .eq('status', filter)
      .order('due_date', { ascending: false });

    if (!error) setRecords(data ?? []);
    setLoading(false);
  }

  async function markCompleted(id: string) {
    setActionLoading(id);
    const { error } = await supabase
      .from('maintenance_records')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) setRecords((prev) => prev.filter((r) => r.id !== id));
    setActionLoading(null);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const tabs: { key: FilterStatus; label: string }[] = [
    { key: 'ordered', label: 'Замовлені' },
    { key: 'due', label: 'Очікують рішення' },
    { key: 'completed', label: 'Виконані' },
    { key: 'declined', label: 'Відхилені клієнтом' },
  ];

  return (
    <>
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            id={tab.key}
            label={tab.label}
            active={filter === tab.key}
            onClick={() => setFilter(tab.key)}
            count={filter === tab.key ? records.length : undefined}
          />
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#8893A2] font-medium">Завантаження…</div>
        </div>
      ) : records.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-5xl mb-3">🔧</div>
            <div className="text-xl font-bold text-[#20303C] mb-2">Список порожній</div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#8893A2] text-xs uppercase tracking-widest border-b border-[#E8EDF4]">
                <th className="px-5 py-3 font-bold">Клієнт</th>
                <th className="px-5 py-3 font-bold">Обладнання</th>
                <th className="px-5 py-3 font-bold">Тип ТО</th>
                <th className="px-5 py-3 font-bold">Термін</th>
                <th className="px-5 py-3 font-bold">Ціна</th>
                <th className="px-5 py-3 font-bold">Статус</th>
                <th className="px-5 py-3 font-bold" />
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-[#E8EDF4] last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[#20303C]">{r.warranties?.client_name ?? '—'}</div>
                    <div className="text-[#8893A2] text-xs">{r.warranties?.client_phone ?? '—'}</div>
                  </td>
                  <td className="px-5 py-4 text-[#20303C]">{r.equipment_name ?? '—'}</td>
                  <td className="px-5 py-4 text-[#546070]">{MILESTONE_LABEL[r.milestone]}</td>
                  <td className="px-5 py-4 text-[#546070]">{formatDate(r.due_date)}</td>
                  <td className="px-5 py-4 text-[#546070]">
                    {Number(r.price_uah) > 0 ? `${Number(r.price_uah).toLocaleString()} ₴` : 'Безкоштовно'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {r.status === 'ordered' && (
                      <button
                        onClick={() => markCompleted(r.id)}
                        disabled={!!actionLoading}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
                      >
                        {actionLoading === r.id ? '⏳' : '✓ Виконано'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function PricesTab() {
  const [settings, setSettings] = useState<Settings>({ price_3m_uah: 0, price_6m_uah: 0, price_12m_uah: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data } = await supabase.from('maintenance_settings').select('*').eq('id', 1).maybeSingle();
    if (data) {
      setSettings({
        price_3m_uah: Number(data.price_3m_uah ?? 0),
        price_6m_uah: Number(data.price_6m_uah ?? 0),
        price_12m_uah: Number(data.price_12m_uah ?? 0),
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { data, error } = await supabase
      .from('maintenance_settings')
      .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      alert(error.message);
    } else {
      setSettings({
        price_3m_uah: Number(data.price_3m_uah ?? 0),
        price_6m_uah: Number(data.price_6m_uah ?? 0),
        price_12m_uah: Number(data.price_12m_uah ?? 0),
      });
      alert('Збережено');
    }
    setSaving(false);
  }

  function set<K extends keyof Settings>(key: K, value: number) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return <div className="text-[#8893A2]">Завантаження…</div>;
  }

  const inputClass =
    'w-full border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8] max-w-[160px]';

  const rows: { key: keyof Settings; title: string; sub: string }[] = [
    { key: 'price_3m_uah', title: 'Базове ТО (3 міс.)', sub: 'Перше нагадування — через 3 місяці від активації гарантії' },
    { key: 'price_6m_uah', title: 'Рекомендоване ТО (6 міс.)', sub: 'Друге нагадування — через 6 місяців' },
    { key: 'price_12m_uah', title: 'Комплексне ТО (12 міс.)', sub: 'Третє нагадування — через 12 місяців' },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      {rows.map((row) => (
        <div key={row.key} className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-1">{row.title}</div>
          <p className="text-[#8893A2] text-xs mb-3">{row.sub}</p>
          <div className="flex items-center gap-2">
            <input
              value={settings[row.key]}
              onChange={(e) => set(row.key, Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
              placeholder="0"
              inputMode="decimal"
              className={inputClass}
            />
            <span className="text-sm font-semibold text-[#546070]">грн (0 = безкоштовно)</span>
          </div>
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50 self-start"
      >
        {saving ? 'Збереження…' : 'Зберегти'}
      </button>
    </div>
  );
}

export default function MaintenancePage() {
  const [tab, setTab] = useState<'requests' | 'prices'>('requests');

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Технічне обслуговування</h1>
        <p className="text-[#8893A2] mt-1">
          Заявки на планове ТО кавомашин (3 / 6 / 12 місяців від активації гарантії) та ціни на них
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <Tab id="requests" label="Заявки" active={tab === 'requests'} onClick={() => setTab('requests')} />
        <Tab id="prices" label="Ціни" active={tab === 'prices'} onClick={() => setTab('prices')} />
      </div>

      {tab === 'requests' ? <RequestsTab /> : <PricesTab />}
    </div>
  );
}
