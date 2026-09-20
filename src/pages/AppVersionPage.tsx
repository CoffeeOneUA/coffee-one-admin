import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface Settings {
  latest_version: string;
  update_message: string;
  ios_store_url: string;
  android_store_url: string;
}

const EMPTY: Settings = {
  latest_version: '',
  update_message: '',
  ios_store_url: '',
  android_store_url: '',
};

const inputClass =
  'w-full border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]';

export default function AppVersionPage() {
  const [settings, setSettings] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data } = await supabase.from('app_version_settings').select('*').eq('id', 1).maybeSingle();
    if (data) {
      setSettings({
        latest_version: data.latest_version ?? '',
        update_message: data.update_message ?? '',
        ios_store_url: data.ios_store_url ?? '',
        android_store_url: data.android_store_url ?? '',
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!settings.latest_version.trim()) {
      alert('Вкажіть номер версії');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('app_version_settings').upsert({
      id: 1,
      latest_version: settings.latest_version.trim(),
      update_message: settings.update_message.trim() || null,
      ios_store_url: settings.ios_store_url.trim() || null,
      android_store_url: settings.android_store_url.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    alert(error ? error.message : 'Збережено');
  }

  async function handleNotify() {
    if (!settings.latest_version.trim()) {
      alert('Спершу збережіть номер версії');
      return;
    }
    if (!confirm(`Надіслати push-сповіщення про версію ${settings.latest_version} усім користувачам?`)) return;

    setSending(true);
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        title: `Доступна нова версія ${settings.latest_version}`,
        body: settings.update_message.trim() || 'Оновіть Coffee One, щоб отримати останні покращення.',
        user_ids: null,
        target_screen: null,
        target_id: null,
      }),
    });
    setSending(false);

    if (res.ok) {
      alert('Сповіщення надіслано');
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? 'Не вдалося надіслати сповіщення');
    }
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

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Версія застосунку</h1>
        <p className="text-[#8893A2] mt-1">
          Коли номер тут вищий за версію, яку користувач фактично має встановленою, на головному екрані
          застосунку з'являється ненав'язливий блок із закликом оновитись (посилання на стор). Блок сам
          зникає, щойно людина оновиться. Тут же можна одноразово розіслати push-сповіщення про вихід
          нової версії.
        </p>
      </div>

      <div className="flex flex-col gap-5 max-w-xl">
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-3">Актуальна версія</div>
          <input
            value={settings.latest_version}
            onChange={(e) => set('latest_version', e.target.value)}
            placeholder="1.1.0"
            className={inputClass}
          />
          <p className="text-[#8893A2] text-xs mt-2">
            Має збігатися з версією, яку ви публікуєте в App Store / Google Play (формат x.y.z).
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-3">Текст на блоці/у сповіщенні</div>
          <textarea
            value={settings.update_message}
            onChange={(e) => set('update_message', e.target.value)}
            placeholder="Наприклад: додали безпечну доставку та покращили пошук"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-3">Посилання App Store (iOS)</div>
          <input
            value={settings.ios_store_url}
            onChange={(e) => set('ios_store_url', e.target.value)}
            placeholder="https://apps.apple.com/app/id..."
            className={inputClass}
          />
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-3">Посилання Google Play (Android)</div>
          <input
            value={settings.android_store_url}
            onChange={(e) => set('android_store_url', e.target.value)}
            placeholder="https://play.google.com/store/apps/details?id=..."
            className={inputClass}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
          >
            {saving ? 'Збереження…' : 'Зберегти'}
          </button>
          <button
            onClick={handleNotify}
            disabled={sending}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#F1F5FB] text-[#546070] hover:bg-[#e4ebf5] disabled:opacity-50"
          >
            {sending ? 'Надсилаємо…' : '📣 Надіслати push про оновлення'}
          </button>
        </div>
      </div>
    </div>
  );
}
