import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface Settings {
  listing_fee_uah: number;
  extra_listing_fee_uah: number;
  marketplace_commission_percent: number;
  wayforpay_enabled: boolean;
  wayforpay_merchant_account: string;
  wayforpay_secret_key: string;
  wayforpay_domain: string;
  monobank_enabled: boolean;
  monobank_token: string;
}

const EMPTY: Settings = {
  listing_fee_uah: 460,
  extra_listing_fee_uah: 55,
  marketplace_commission_percent: 7,
  wayforpay_enabled: false,
  wayforpay_merchant_account: '',
  wayforpay_secret_key: '',
  wayforpay_domain: '',
  monobank_enabled: false,
  monobank_token: '',
};

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

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  function mapRow(data: any): Settings {
    return {
      listing_fee_uah: Number(data.listing_fee_uah ?? 460),
      extra_listing_fee_uah: Number(data.extra_listing_fee_uah ?? 55),
      marketplace_commission_percent: Number(data.marketplace_commission_percent ?? 7),
      wayforpay_enabled: !!data.wayforpay_enabled,
      wayforpay_merchant_account: data.wayforpay_merchant_account ?? '',
      wayforpay_secret_key: data.wayforpay_secret_key ?? '',
      wayforpay_domain: data.wayforpay_domain ?? '',
      monobank_enabled: !!data.monobank_enabled,
      monobank_token: data.monobank_token ?? '',
    };
  }

  async function fetchSettings() {
    setLoading(true);
    const { data } = await supabase.from('payment_settings').select('*').eq('id', 1).maybeSingle();
    if (data) setSettings(mapRow(data));
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { data, error } = await supabase
      .from('payment_settings')
      .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      alert(error.message);
    } else {
      // Підтягуємо назад те, що реально записалось в базу — щоб перемикачі
      // на екрані завжди відповідали дійсному стану, а не тому, що ми
      // сподівались записати.
      setSettings(mapRow(data));
      alert(
        `Збережено. WayForPay: ${data.wayforpay_enabled ? 'увімкнено' : 'вимкнено'}, ` +
        `Monobank: ${data.monobank_enabled ? 'увімкнено' : 'вимкнено'}`
      );
    }
    setSaving(false);
  }

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-[#8893A2]">Завантаження…</div>
      </div>
    );
  }

  const inputClass =
    'w-full border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]';
  const secretType = showSecrets ? 'text' : 'password';

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20303C]">Оплата</h1>
          <p className="text-[#8893A2] mt-1">
            Платіжні шлюзи для оплати розміщення оголошень. Можна увімкнути один або обидва —
            якщо активні обидва, юзер обирає спосіб оплати в застосунку.
          </p>
        </div>
        <button onClick={() => setShowSecrets((v) => !v)} className="text-xs font-semibold text-[#187FD8] flex-shrink-0">
          {showSecrets ? 'Приховати ключі' : 'Показати ключі'}
        </button>
      </div>

      <div className="flex flex-col gap-5 max-w-xl">
        {/* Підписка на розміщення */}
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-1">Підписка на розміщення</div>
          <p className="text-[#8893A2] text-xs mb-3">
            Дає право розмістити 5 оголошень протягом 30 календарних днів з моменту покупки
          </p>
          <div className="flex items-center gap-2">
            <input
              value={settings.listing_fee_uah}
              onChange={(e) => set('listing_fee_uah', Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
              placeholder="460"
              inputMode="decimal"
              className={`${inputClass} max-w-[160px]`}
            />
            <span className="text-sm font-semibold text-[#546070]">грн / 5 оголошень / 30 днів</span>
          </div>
        </div>

        {/* Додаткове оголошення понад ліміт */}
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-1">Додаткове оголошення понад ліміт</div>
          <p className="text-[#8893A2] text-xs mb-3">
            Якщо в межах активної підписки вже використано всі 5 оголошень — кожне наступне
            оплачується окремо за цією ціною
          </p>
          <div className="flex items-center gap-2">
            <input
              value={settings.extra_listing_fee_uah}
              onChange={(e) => set('extra_listing_fee_uah', Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
              placeholder="55"
              inputMode="decimal"
              className={`${inputClass} max-w-[160px]`}
            />
            <span className="text-sm font-semibold text-[#546070]">грн / оголошення</span>
          </div>
        </div>

        {/* Комісія маркетплейсу */}
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-1">Комісія маркетплейсу</div>
          <p className="text-[#8893A2] text-xs mb-3">
            Показується продавцю в застосунку при розміщенні оголошення — скільки він отримає "на
            руки" після продажу за вказаною ціною
          </p>
          <div className="flex items-center gap-2">
            <input
              value={settings.marketplace_commission_percent}
              onChange={(e) => set('marketplace_commission_percent', Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
              placeholder="7"
              inputMode="decimal"
              className={`${inputClass} max-w-[160px]`}
            />
            <span className="text-sm font-semibold text-[#546070]">%</span>
          </div>
        </div>

        {/* WayForPay */}
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-[#20303C]">WayForPay</div>
            <Toggle on={settings.wayforpay_enabled} onChange={(v) => set('wayforpay_enabled', v)} />
          </div>
          <div className="flex flex-col gap-2">
            <input
              value={settings.wayforpay_merchant_account}
              onChange={(e) => set('wayforpay_merchant_account', e.target.value)}
              placeholder="Merchant Account"
              className={inputClass}
            />
            <input
              value={settings.wayforpay_secret_key}
              onChange={(e) => set('wayforpay_secret_key', e.target.value)}
              placeholder="Merchant Secret Key"
              type={secretType}
              className={inputClass}
            />
            <input
              value={settings.wayforpay_domain}
              onChange={(e) => set('wayforpay_domain', e.target.value)}
              placeholder="Merchant Domain Name (напр. coffeeone.com.ua)"
              className={inputClass}
            />
          </div>
        </div>

        {/* Monobank */}
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-[#20303C]">Monobank Acquiring</div>
            <Toggle on={settings.monobank_enabled} onChange={(v) => set('monobank_enabled', v)} />
          </div>
          <input
            value={settings.monobank_token}
            onChange={(e) => set('monobank_token', e.target.value)}
            placeholder="X-Token"
            type={secretType}
            className={inputClass}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50 self-start"
        >
          {saving ? 'Збереження…' : 'Зберегти'}
        </button>

        <p className="text-[#8893A2] text-xs">
          Ключі зберігаються в базі даних (не в коді застосунку), доступ до цієї таблиці мають
          лише сервісні функції й адмінка — у мобільному застосунку й публічному API вони не
          з'являються.
        </p>
      </div>
    </div>
  );
}
