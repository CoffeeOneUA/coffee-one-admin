import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface Settings {
  telegram_url: string;
  whatsapp_url: string;
  viber_url: string;
}

const EMPTY: Settings = {
  telegram_url: '',
  whatsapp_url: '',
  viber_url: '',
};

export default function SupportPage() {
  const [settings, setSettings] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data } = await supabase.from('support_settings').select('*').eq('id', 1).maybeSingle();
    if (data) {
      setSettings({
        telegram_url: data.telegram_url ?? '',
        whatsapp_url: data.whatsapp_url ?? '',
        viber_url: data.viber_url ?? '',
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('support_settings').upsert({
      id: 1,
      telegram_url: settings.telegram_url.trim() || null,
      whatsapp_url: settings.whatsapp_url.trim() || null,
      viber_url: settings.viber_url.trim() || null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      alert(error.message);
    } else {
      alert('Збережено');
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

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Служба підтримки</h1>
        <p className="text-[#8893A2] mt-1">
          Посилання на боти підтримки — можна залишити один, два або всі три канали. Порожні поля
          в застосунку просто не показуються.
        </p>
      </div>

      <div className="flex flex-col gap-5 max-w-xl">
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-3">Telegram</div>
          <input
            value={settings.telegram_url}
            onChange={(e) => set('telegram_url', e.target.value)}
            placeholder="https://t.me/coffeeone_bot"
            className={inputClass}
          />
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-3">WhatsApp</div>
          <input
            value={settings.whatsapp_url}
            onChange={(e) => set('whatsapp_url', e.target.value)}
            placeholder="https://wa.me/380XXXXXXXXX"
            className={inputClass}
          />
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-3">Viber</div>
          <input
            value={settings.viber_url}
            onChange={(e) => set('viber_url', e.target.value)}
            placeholder="viber://pa?chatURI=coffeeone"
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
      </div>
    </div>
  );
}
