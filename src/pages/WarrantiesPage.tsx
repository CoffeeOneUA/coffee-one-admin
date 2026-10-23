import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface Warranty {
  id: string;
  doc_id: string | null;
  member_id: string | null;
  client_id: string | null;
  client_name: string;
  client_phone: string;
  machine_id: string | null;
  goods: string | null;
  warranty_raw: string | null;
  invoice_date: string | null;
  invoice_total: number | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  status: 'pending_1c' | 'active' | 'cancelled' | 'expired' | 'renewed';
  activated_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  activation_request_error: string | null;
  source: 'qr_1c' | 'invoice_photo' | 'invoice_pdf' | null;
}

interface Baf1cSettings {
  enabled: boolean;
  base_url: string | null;
  auth_login: string | null;
  auth_password: string | null;
  webhook_secret: string;
}

// Гарантія, яка 3+ місяці чекає підтвердження від 1С і, скоріш за все,
// вже не дочекається (клієнт так і не оплатив, або запит до 1С загубився).
const STALE_AFTER_DAYS = 90;

const SOURCE_LABEL: Record<string, string> = {
  qr_1c: 'QR / 1С',
  invoice_photo: 'Фото документа (ШІ)',
  invoice_pdf: 'PDF документа (ШІ)',
};

const STATUS_LABEL: Record<Warranty['status'], string> = {
  pending_1c: 'Очікує 1С',
  active: 'Активна',
  cancelled: 'Скасовано',
  expired: 'Закінчилась',
  renewed: 'Продовжена',
};

const STATUS_COLOR: Record<Warranty['status'], string> = {
  pending_1c: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-200 text-gray-600',
  expired: 'bg-red-100 text-red-700',
  renewed: 'bg-blue-100 text-blue-700',
};

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function isStale(w: Warranty): boolean {
  return w.status === 'pending_1c' && daysSince(w.activated_at) >= STALE_AFTER_DAYS;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-[#187FD8]' : 'bg-[#D7DFEA]'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function Baf1cSettingsPanel() {
  const [settings, setSettings] = useState<Baf1cSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('warranty_1c_settings')
        .select('enabled, base_url, auth_login, auth_password, webhook_secret')
        .eq('id', 1)
        .maybeSingle();
      setSettings(data);
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from('warranty_1c_settings')
      .update({
        enabled: settings.enabled,
        base_url: settings.base_url,
        auth_login: settings.auth_login,
        auth_password: settings.auth_password,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    setSaving(false);
    if (error) alert(error.message);
  }

  if (loading || !settings) return null;

  const callbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/warranty-1c-webhook?secret=${settings.webhook_secret}`;

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm mb-6 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#20303C]">⚙ Інтеграція з 1С (BAF)</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${settings.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
            {settings.enabled ? 'Увімкнена' : 'Вимкнена'}
          </span>
        </div>
        <span className="text-[#8893A2]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[#E8EDF4] pt-4 space-y-4">
          <div className="bg-amber-50 text-amber-800 text-sm rounded-xl p-3">
            Поки вимкнено, нові гарантії все одно створюються й чекають підтвердження —
            просто запит у 1С не надсилається. Увімкніть, щойно розробник 1С реалізує й
            протестує прийом запиту та відповідний колбек за специфікацією
            docs/1c-warranty-integration.md.
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#20303C]">Надсилати запити до 1С</span>
            <Toggle on={settings.enabled} onChange={(v) => setSettings({ ...settings, enabled: v })} />
          </div>

          <div>
            <label className="text-xs font-bold text-[#546070] mb-1.5 block">URL ендпоінта BAF</label>
            <input
              value={settings.base_url ?? ''}
              onChange={(e) => setSettings({ ...settings, base_url: e.target.value })}
              className="w-full border border-[#D7DFEA] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#546070] mb-1.5 block">Логін (Basic Auth)</label>
              <input
                value={settings.auth_login ?? ''}
                onChange={(e) => setSettings({ ...settings, auth_login: e.target.value })}
                className="w-full border border-[#D7DFEA] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#546070] mb-1.5 block">Пароль</label>
              <input
                type="password"
                value={settings.auth_password ?? ''}
                onChange={(e) => setSettings({ ...settings, auth_password: e.target.value })}
                className="w-full border border-[#D7DFEA] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#546070] mb-1.5 block">
              Callback URL (дати розробнику 1С — сюди BAF шле підтвердження оплати)
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                type={showSecret ? 'text' : 'password'}
                value={callbackUrl}
                className="w-full border border-[#D7DFEA] rounded-xl px-3.5 py-2.5 text-sm bg-[#F5F7FA] text-[#546070]"
              />
              <button
                onClick={() => setShowSecret((v) => !v)}
                className="px-3 rounded-xl border border-[#D7DFEA] text-sm shrink-0"
              >
                {showSecret ? 'Сховати' : 'Показати'}
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(callbackUrl)}
                className="px-3 rounded-xl border border-[#D7DFEA] text-sm shrink-0"
              >
                Копіювати
              </button>
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
          >
            {saving ? 'Зберігаю…' : 'Зберегти'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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

  async function cancelWarranty(w: Warranty) {
    const reason = window.prompt(
      `Скасувати гарантію на "${w.goods ?? 'обладнання'}" (${w.client_name})?\nПричина (необов'язково):`
    );
    if (reason === null) return; // натиснули "Скасувати" в самому prompt — нічого не робимо

    setCancellingId(w.id);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('warranties')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: reason.trim() || null,
        cancelled_by: auth.user?.id ?? null,
      })
      .eq('id', w.id);
    setCancellingId(null);

    if (error) {
      alert(error.message);
      return;
    }
    setWarranties((prev) => prev.map((x) => (x.id === w.id ? { ...x, status: 'cancelled', cancelled_reason: reason.trim() || null } : x)));
  }

  const normalizedSearch = search.trim().toLowerCase();
  const searchDigits = search.replace(/\D/g, '');
  const filtered = !normalizedSearch
    ? warranties
    : warranties.filter((w) => {
        const nameMatch = w.client_name?.toLowerCase().includes(normalizedSearch);
        const phoneMatch = searchDigits && w.client_phone?.replace(/\D/g, '').includes(searchDigits);
        const docMatch = w.doc_id?.toLowerCase().includes(normalizedSearch);
        return nameMatch || phoneMatch || docMatch;
      });

  const staleCount = warranties.filter(isStale).length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Гарантії</h1>
        <p className="text-[#8893A2] mt-1">Активація гарантій через сканування документа й підтвердження оплати з 1С</p>
      </div>

      <Baf1cSettingsPanel />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative max-w-md w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8893A2]">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за прізвищем, телефоном або № документа…"
            className="w-full border border-[#E8EDF4] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
          />
        </div>
        {normalizedSearch && (
          <span className="text-[#8893A2] text-sm font-medium shrink-0">Знайдено: {filtered.length}</span>
        )}
        {staleCount > 0 && (
          <span className="text-amber-700 bg-amber-100 text-sm font-bold px-3 py-1.5 rounded-full shrink-0">
            ⚠ Зависло без підтвердження: {staleCount}
          </span>
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
            <div className="text-[#8893A2] text-sm">Спробуйте інше прізвище, телефон або номер документа</div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#8893A2] text-xs uppercase tracking-widest border-b border-[#E8EDF4]">
                <th className="px-5 py-3 font-bold">Клієнт</th>
                <th className="px-5 py-3 font-bold">Обладнання</th>
                <th className="px-5 py-3 font-bold">№ документа</th>
                <th className="px-5 py-3 font-bold">Подано</th>
                <th className="px-5 py-3 font-bold">Старт / закінчення</th>
                <th className="px-5 py-3 font-bold">Статус</th>
                <th className="px-5 py-3 font-bold">Джерело</th>
                <th className="px-5 py-3 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => {
                const stale = isStale(w);
                return (
                  <tr key={w.id} className={`border-b border-[#E8EDF4] last:border-0 ${stale ? 'bg-amber-50/60' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-[#20303C]">{w.client_name}</div>
                      <div className="text-[#8893A2] text-xs">{w.client_phone}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-[#20303C]">{w.goods ?? '—'}</div>
                      <div className="text-[#8893A2] text-xs">ID машини: {w.machine_id ?? '—'}</div>
                    </td>
                    <td className="px-5 py-4 text-[#546070]">{w.doc_id ?? '—'}</td>
                    <td className="px-5 py-4 text-[#546070]">{formatDate(w.activated_at)}</td>
                    <td className="px-5 py-4 text-[#546070]">
                      {w.status === 'pending_1c' ? (
                        <span className="text-[#8893A2] text-xs italic">
                          {stale ? `Без відповіді ${daysSince(w.activated_at)} дн.` : 'Чекає підтвердження'}
                        </span>
                      ) : (
                        <>
                          {formatDate(w.warranty_start_date)} → {formatDate(w.warranty_end_date)}
                          {!w.warranty_end_date && w.status === 'active' && (
                            <div className="text-amber-600 text-xs font-semibold mt-0.5">
                              Термін не визначено {w.warranty_raw ? `("${w.warranty_raw}")` : ''}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[w.status]}`}>
                        {STATUS_LABEL[w.status]}
                      </span>
                      {w.activation_request_error && w.status === 'pending_1c' && (
                        <div className="text-red-600 text-xs mt-1 max-w-[220px]" title={w.activation_request_error}>
                          Помилка запиту до 1С
                        </div>
                      )}
                      {w.status === 'cancelled' && w.cancelled_reason && (
                        <div className="text-[#8893A2] text-xs mt-1 max-w-[220px]">{w.cancelled_reason}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[#546070] text-xs">
                      {SOURCE_LABEL[w.source ?? 'qr_1c'] ?? w.source}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {(w.status === 'active' || w.status === 'pending_1c') && (
                        <button
                          onClick={() => cancelWarranty(w)}
                          disabled={cancellingId === w.id}
                          className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Скасувати
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
