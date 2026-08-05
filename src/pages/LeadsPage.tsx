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

type LeadStatus = 'new' | 'contacted' | 'in_progress' | 'waiting_client' | 'won' | 'lost' | 'closed';

interface Lead {
  id: string;
  type: LeadType;
  name: string;
  phone: string;
  message: string | null;
  meta: Record<string, string> | null;
  status: LeadStatus;
  created_at: string;
}

interface HistoryEntry {
  id: string;
  status: LeadStatus;
  changed_at: string;
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

const STATUS_ORDER: LeadStatus[] = ['new', 'contacted', 'in_progress', 'waiting_client', 'won', 'lost', 'closed'];

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'Нова',
  contacted: 'На звʼязку',
  in_progress: 'В опрацюванні',
  waiting_client: 'Очікує відповідь клієнта',
  won: 'Успішно (конверсія)',
  lost: 'Відмова',
  closed: 'Закрита',
};

const STATUS_COLOR: Record<LeadStatus, string> = {
  new: 'bg-amber-100 text-amber-700',
  contacted: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  waiting_client: 'bg-cyan-100 text-cyan-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  closed: 'bg-gray-100 text-gray-500',
};

const selectClass = 'text-xs font-bold px-2.5 py-1.5 rounded-lg border-2 border-[#E8EDF4] bg-white focus:outline-none focus:ring-2 focus:ring-[#187FD8] cursor-pointer';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<Lead['type'] | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  const [historyByLead, setHistoryByLead] = useState<Record<string, HistoryEntry[] | 'loading'>>({});

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

  async function setStatus(id: string, status: LeadStatus) {
    setActionLoading(id);
    const { error } = await supabase.from('leads').update({ status }).eq('id', id);
    if (!error) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      // Історія пишеться тригером у БД — якщо вкладка розкрита, підвантажимо її наново.
      if (openHistoryId === id) void loadHistory(id);
    }
    setActionLoading(null);
  }

  async function loadHistory(id: string) {
    setHistoryByLead((prev) => ({ ...prev, [id]: 'loading' }));
    const { data, error } = await supabase
      .from('lead_status_history')
      .select('id, status, changed_at')
      .eq('lead_id', id)
      .order('changed_at', { ascending: false });
    setHistoryByLead((prev) => ({ ...prev, [id]: error ? [] : (data as HistoryEntry[]) }));
  }

  function toggleHistory(id: string) {
    if (openHistoryId === id) {
      setOpenHistoryId(null);
      return;
    }
    setOpenHistoryId(id);
    if (!historyByLead[id]) void loadHistory(id);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const filtered = leads
    .filter((l) => typeFilter === 'all' || l.type === typeFilter)
    .filter((l) => statusFilter === 'all' || l.status === statusFilter);

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

      <div className="flex gap-2 mb-3 flex-wrap">
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

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all ${
            statusFilter === 'all' ? 'bg-[#187FD8] text-white' : 'bg-white text-[#8893A2] hover:bg-gray-50 border border-[#E8EDF4]'
          }`}
        >
          Усі статуси
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all ${
              statusFilter === s ? 'bg-[#187FD8] text-white' : 'bg-white text-[#8893A2] hover:bg-gray-50 border border-[#E8EDF4]'
            }`}
          >
            {STATUS_LABEL[s]}
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
          {filtered.map((lead, i) => {
            const history = historyByLead[lead.id];
            return (
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

                <div className="flex items-center gap-3 mt-3">
                  <label className="text-xs font-semibold text-[#8893A2]">Статус:</label>
                  <select
                    value={lead.status}
                    disabled={actionLoading === lead.id}
                    onChange={(e) => setStatus(lead.id, e.target.value as LeadStatus)}
                    className={selectClass}
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => toggleHistory(lead.id)}
                    className="text-xs font-semibold text-[#187FD8] hover:underline ml-auto"
                  >
                    {openHistoryId === lead.id ? 'Сховати історію ▲' : 'Історія статусів ▼'}
                  </button>
                </div>

                {openHistoryId === lead.id && (
                  <div className="mt-3 bg-[#F8FAFC] rounded-xl p-3.5">
                    {history === 'loading' || history === undefined ? (
                      <div className="text-[#8893A2] text-xs">Завантаження…</div>
                    ) : history.length === 0 ? (
                      <div className="text-[#8893A2] text-xs">Історії ще немає</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {history.map((h) => (
                          <div key={h.id} className="flex items-center justify-between text-xs">
                            <span className={`font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[h.status]}`}>
                              {STATUS_LABEL[h.status] ?? h.status}
                            </span>
                            <span className="text-[#8893A2]">{formatDate(h.changed_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
