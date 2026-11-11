import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';

// Окремий мерчант-акаунт (ФОП Гладкий Петро Аркадійович) для розстрочки
// на піддомені credit.coffeeone-market.com.ua — не плутати з payment_settings
// основного маркетплейсу.

const CREDIT_SITE_URL = 'https://credit.coffeeone-market.com.ua';

interface CreditSettings {
  monobank_enabled: boolean;
  monobank_store_id: string | null;
  monobank_sign_key: string | null;
  abank_enabled: boolean;
  abank_credentials: Record<string, unknown> | null;
}

interface CreditLink {
  id: string;
  slug: string;
  title: string;
  price_uah: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  paid_at: string | null;
  client_phone: string | null;
  payments_number: number | null;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-[#187FD8]' : 'bg-[#D7DFEA]'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function genSlug(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

function SettingsPanel() {
  const [settings, setSettings] = useState<CreditSettings | null>(null);
  const [abankCredsText, setAbankCredsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('credit_settings').select('*').eq('id', 1).maybeSingle();
      setSettings(data);
      setAbankCredsText(data?.abank_credentials ? JSON.stringify(data.abank_credentials, null, 2) : '');
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!settings) return;
    let abank_credentials: Record<string, unknown> | null = null;
    if (abankCredsText.trim()) {
      try {
        abank_credentials = JSON.parse(abankCredsText);
      } catch {
        alert('Реквізити А-Банку мають бути в форматі JSON, напр. {"merchant_id": "...", "api_key": "..."}');
        return;
      }
    }
    setSaving(true);
    const { error } = await supabase
      .from('credit_settings')
      .update({ ...settings, abank_credentials, updated_at: new Date().toISOString() })
      .eq('id', 1);
    setSaving(false);
    if (error) alert(error.message);
    else alert('Збережено');
  }

  if (loading || !settings) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm mb-6 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-[#EAF2FC] text-[#1169B8] flex items-center justify-center shrink-0">
            <Icon name="creditCard" size={15} />
          </span>
          <span className="font-bold text-[#20303C]">Мерчант-акаунти розстрочки (ФОП Гладкий П.А.)</span>
        </div>
        <Icon name="chevronDown" size={16} className={open ? 'rotate-180' : ''} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[#E8EDF4] pt-4 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#20303C]">Monobank (Покупка частинами)</span>
              <Toggle on={settings.monobank_enabled} onChange={(v) => setSettings({ ...settings, monobank_enabled: v })} />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Store ID</label>
                <input
                  value={settings.monobank_store_id ?? ''}
                  onChange={(e) => setSettings({ ...settings, monobank_store_id: e.target.value })}
                  className="w-full border border-[#D7DFEA] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Ключ підпису (signKey)</label>
                <input
                  type="password"
                  value={settings.monobank_sign_key ?? ''}
                  onChange={(e) => setSettings({ ...settings, monobank_sign_key: e.target.value })}
                  className="w-full border border-[#D7DFEA] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#20303C]">А-Банк (пряма інтеграція, Плати частинами)</span>
              <Toggle on={settings.abank_enabled} onChange={(v) => setSettings({ ...settings, abank_enabled: v })} />
            </div>
            <div className="bg-amber-50 text-amber-800 text-xs rounded-xl p-3 mb-3">
              Поки без WayForPay — пряма інтеграція з API А-Банку в розробці. Вставте сюди реквізити,
              які видав банк (у форматі JSON), коли буде готовий сам платіжний флоу.
            </div>
            <label className="text-xs font-bold text-[#546070] mb-1.5 block">Реквізити (JSON)</label>
            <textarea
              value={abankCredsText}
              onChange={(e) => setAbankCredsText(e.target.value)}
              rows={5}
              placeholder='{"merchant_id": "...", "api_key": "...", "secret": "..."}'
              className="w-full border border-[#D7DFEA] rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
            />
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
          >
            {saving ? 'Збереження…' : 'Зберегти'}
          </button>
        </div>
      )}
    </div>
  );
}

function NewLinkForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentsNumber, setPaymentsNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim() || !price || Number(price) <= 0) {
      alert('Вкажіть назву і ціну');
      return;
    }
    if (phone.trim() && !/^\+380\d{9}$/.test(phone.trim())) {
      alert('Телефон має бути у форматі +380XXXXXXXXX (або залиште поле порожнім)');
      return;
    }
    setSaving(true);
    const slug = genSlug();
    const { error } = await supabase.from('credit_links').insert({
      slug,
      title: title.trim(),
      price_uah: Number(price),
      client_phone: phone.trim() || null,
      payments_number: paymentsNumber ? Number(paymentsNumber) : null,
    });
    setSaving(false);
    if (error) {
      alert(`Не вдалося створити посилання: ${error.message}`);
      return;
    }
    setLastUrl(`${CREDIT_SITE_URL}/l/${slug}`);
    setTitle('');
    setPrice('');
    setPhone('');
    setPaymentsNumber('');
    onCreated();
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5 mb-6 max-w-xl">
      <div className="font-bold text-[#20303C] mb-3">Нове персональне посилання на розстрочку</div>
      <div className="flex flex-col gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Назва (напр. «Кавомашина La Marzocco Linea Classic»)"
          className="border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
        />
        <input
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Ціна, грн"
          className="border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Телефон клієнта, +380XXXXXXXXX (обов'язково для Monobank, можна лишити порожнім і ввести на сторінці оплати)"
          className="border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
        />
        <div>
          <input
            type="number"
            min={3}
            max={25}
            value={paymentsNumber}
            onChange={(e) => setPaymentsNumber(e.target.value)}
            placeholder="Кількість платежів (орієнтовно, 3-25)"
            className="w-full border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
          />
          <p className="text-xs text-[#8893A2] mt-1">
            Поки лише інформаційно для клієнта — Monobank не підтвердив публічно, чи приймає цей параметр
            у запиті, чи кількість платежів фіксована окремо для нашого store-id. Остаточно клієнт обирає
            кількість на стороні банку.
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="px-4 py-2.5 rounded-lg text-sm font-bold bg-[#20303C] text-white hover:bg-[#182530] disabled:opacity-50 self-start"
        >
          {saving ? 'Створення…' : 'Створити посилання'}
        </button>
      </div>

      {lastUrl && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <input readOnly value={lastUrl} className="flex-1 bg-transparent text-sm text-green-800 outline-none" />
          <button
            onClick={() => navigator.clipboard.writeText(lastUrl)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 shrink-0"
          >
            Копіювати
          </button>
        </div>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<CreditLink['status'], string> = {
  pending: 'Очікує оплати',
  paid: 'Оплачено',
  cancelled: 'Скасовано',
};
const STATUS_COLOR: Record<CreditLink['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-200 text-gray-600',
};

export default function CreditPage() {
  const [links, setLinks] = useState<CreditLink[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLinks() {
    const { data, error } = await supabase.from('credit_links').select('*').order('created_at', { ascending: false });
    if (!error) setLinks(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchLinks();
  }, []);

  async function cancelLink(id: string) {
    if (!confirm('Скасувати це посилання?')) return;
    const { error } = await supabase.from('credit_links').update({ status: 'cancelled' }).eq('id', id);
    if (error) alert(error.message);
    else setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'cancelled' } : l)));
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Розстрочка</h1>
        <p className="text-[#8893A2] mt-1">
          Персональні посилання на оформлення розстрочки (credit.coffeeone-market.com.ua) — окремо від основного маркетплейсу
        </p>
      </div>

      <SettingsPanel />
      <NewLinkForm onCreated={fetchLinks} />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#8893A2] font-medium">Завантаження…</div>
        </div>
      ) : links.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="flex justify-center mb-3"><Icon name="creditCard" size={40} color="#C2CDDA" /></div>
            <div className="text-xl font-bold text-[#20303C] mb-2">Посилань ще немає</div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[#8893A2] text-xs uppercase tracking-widest border-b border-[#E8EDF4]">
                <th className="px-5 py-3 font-bold">Назва</th>
                <th className="px-5 py-3 font-bold">Ціна</th>
                <th className="px-5 py-3 font-bold">Створено</th>
                <th className="px-5 py-3 font-bold">Статус</th>
                <th className="px-5 py-3 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id} className="border-b border-[#E8EDF4] last:border-0">
                  <td className="px-5 py-4 text-[#20303C] font-semibold">{l.title}</td>
                  <td className="px-5 py-4 text-[#546070]">{Number(l.price_uah).toLocaleString('uk-UA')} ₴</td>
                  <td className="px-5 py-4 text-[#546070]">{formatDate(l.created_at)}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[l.status]}`}>{STATUS_LABEL[l.status]}</span>
                  </td>
                  <td className="px-5 py-4 text-right flex items-center justify-end gap-3">
                    <button
                      onClick={() => navigator.clipboard.writeText(`${CREDIT_SITE_URL}/l/${l.slug}`)}
                      className="text-xs font-bold text-[#187FD8] hover:underline"
                    >
                      Копіювати посилання
                    </button>
                    {l.status === 'pending' && (
                      <button onClick={() => cancelLink(l.id)} className="text-xs font-bold text-red-600 hover:text-red-700">
                        Скасувати
                      </button>
                    )}
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
