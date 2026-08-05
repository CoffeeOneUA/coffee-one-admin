import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

type LeadType =
  | 'grant'
  | 'trade_in'
  | 'service'
  | 'question'
  | 'credit'
  | 'turnkey'
  | 'partnership'
  | 'service_center';

interface Lead {
  id: string;
  type: LeadType;
  name: string;
  phone: string;
  message: string | null;
  meta: Record<string, string> | null;
  status: 'new' | 'contacted' | 'closed';
  created_at: string;
}

const TYPE_LABEL: Record<LeadType, string> = {
  grant: 'Гранти і лізинг',
  trade_in: 'Trade-IN',
  service: 'Сервіс',
  question: 'Питання про товар',
  credit: 'Кредит та розстрочка',
  turnkey: 'Кав\'ярня «під ключ»',
  partnership: 'Партнерство',
  service_center: 'Сервісний центр',
};

// Людські підписи для полів meta — щоб адмін бачив "Місто: Дніпро",
// а не сирий ключ "city".
const META_LABEL: Record<string, string> = {
  city: 'Місто',
  budget: 'Бюджет',
  request_type: 'Що потрібно',
  service_center_name: 'Сервісний центр',
  issue: 'Опис несправності',
};

const STATUS_LABEL: Record<Lead['status'], string> = {
  new: 'Нова',
  contacted: 'На звʼязку',
  closed: 'Закрита',
};

const STATUS_COLOR: Record<Lead['status'], string> = {
  new: 'bg-amber-100 text-amber-700',
  contacted: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-500',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<Lead['type'] | 'all'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setLeads(data ?? []);
    setLoading(false);
  }

  async function setStatus(id: string, status: Lead['status']) {
    setActionLoading(id);
    const { error } = await supabase.from('leads').update({ status }).eq('id', id);
    if (!error) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    }
    setActionLoading(null);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const filtered = typeFilter === 'all' ? leads : leads.filter((l) => l.type === typeFilter);
  const tabs: { key: Lead['type'] | 'all'; label: string }[] = [
    { key: 'all', label: 'Усі' },
    { key: 'grant', label: 'Гранти і лізинг' },
    { key: 'trade_in', label: 'Trade-IN' },
    { key: 'service', label: 'Сервіс' },
    { key: 'question', label: 'Питання' },
    { key: 'credit', label: 'Кредит' },
    { key: 'turnkey', label: 'Під ключ' },
    { key: 'partnership', label: 'Партнерство' },
    { key: 'service_center', label: 'Сервісний центр' },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Заявки</h1>
        <p className="text-[#8893A2] mt-1">Гранти, Trade-IN та сервіс — усі заявки з мобільного застосунку</p>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTypeFilter(tab.key)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              typeFilter === tab.key
                ? 'bg-[#20303C] text-white shadow-lg'
                : 'bg-white text-[#8893A2] hover:bg-gray-50 border border-[#E8EDF4]'
            }`}
          >
            {tab.label}
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
            <div className="text-5xl mb-3">📭</div>
            <div className="text-xl font-bold text-[#20303C] mb-2">Заявок немає</div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden">
          {filtered.map((lead, i) => (
            <div
              key={lead.id}
              className={`p-5 ${i !== filtered.length - 1 ? 'border-b border-[#E8EDF4]' : ''}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#8893A2] uppercase tracking-widest">
                      {TYPE_LABEL[lead.type]}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[lead.status]}`}>
                      {STATUS_LABEL[lead.status]}
                    </span>
                  </div>
                  <div className="font-bold text-[#20303C] text-base">{lead.name}</div>
                  <a href={`tel:${lead.phone}`} className="text-[#187FD8] text-sm font-semibold">{lead.phone}</a>
                </div>
                <div className="text-[#8893A2] text-xs flex-shrink-0">{formatDate(lead.created_at)}</div>
              </div>

              {lead.message && (
                <p className="text-[#546070] text-sm mt-2 leading-relaxed">{lead.message}</p>
              )}

              {lead.meta && Object.keys(lead.meta).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(lead.meta).map(([key, value]) => (
                    <span key={key} className="bg-[#F1F5FB] text-[#546070] text-xs font-semibold px-2.5 py-1 rounded-lg">
                      {META_LABEL[key] ?? key}: {value}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                {lead.status !== 'contacted' && (
                  <button
                    onClick={() => setStatus(lead.id, 'contacted')}
                    disabled={!!actionLoading}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    На звʼязку
                  </button>
                )}
                {lead.status !== 'closed' && (
                  <button
                    onClick={() => setStatus(lead.id, 'closed')}
                    disabled={!!actionLoading}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Закрити
                  </button>
                )}
                {lead.status !== 'new' && (
                  <button
                    onClick={() => setStatus(lead.id, 'new')}
                    disabled={!!actionLoading}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                  >
                    Повернути в нові
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
