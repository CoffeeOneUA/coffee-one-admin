import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface SiteSettings {
  site_name: string;
  logo_url: string;
  favicon_url: string;
  hero_title: string;
  hero_subtitle: string;
  footer_text: string;
  meta_title: string;
  meta_description: string;
  og_image_url: string;
}

const EMPTY: SiteSettings = {
  site_name: 'Coffee One',
  logo_url: '',
  favicon_url: '',
  hero_title: 'Маркетплейс',
  hero_subtitle: 'Кавове обладнання від перевірених продавців по всій Україні',
  footer_text: 'Coffee One — перший маркетплейс кавового обладнання',
  meta_title: 'Coffee One — маркетплейс кавового обладнання',
  meta_description: 'Купуйте та продавайте кавові машини, кавомолки та аксесуари від перевірених продавців по всій Україні.',
  og_image_url: '',
};

function UploadField({
  label,
  hint,
  value,
  onChange,
  pathPrefix,
  previewClassName,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  pathPrefix: string;
  previewClassName: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `${pathPrefix}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('products').upload(fileName, file, {
        contentType: file.type || 'image/png',
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('products').getPublicUrl(fileName);
      onChange(data.publicUrl);
    } catch (e: any) {
      alert(e.message ?? 'Не вдалося завантажити файл');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
      <div className="font-bold text-[#20303C] mb-3">{label}</div>
      <div className="flex items-center gap-4">
        {value ? (
          <img src={value} alt="" className={previewClassName} />
        ) : (
          <div className={`${previewClassName} bg-[#EAF2FC] flex items-center justify-center text-xl`}>☕</div>
        )}
        <div>
          <input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0] ?? null)} disabled={uploading} className="text-sm" />
          {uploading && <div className="text-xs text-[#8893A2] mt-1">Завантаження…</div>}
          {!value && hint && <div className="text-xs text-[#8893A2] mt-1">{hint}</div>}
        </div>
      </div>
    </div>
  );
}

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
    if (data) {
      setSettings({
        site_name: data.site_name || EMPTY.site_name,
        logo_url: data.logo_url || '',
        favicon_url: data.favicon_url || '',
        hero_title: data.hero_title || EMPTY.hero_title,
        hero_subtitle: data.hero_subtitle || EMPTY.hero_subtitle,
        footer_text: data.footer_text || EMPTY.footer_text,
        meta_title: data.meta_title || EMPTY.meta_title,
        meta_description: data.meta_description || EMPTY.meta_description,
        og_image_url: data.og_image_url || '',
      });
    }
    setLoading(false);
  }

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!settings.site_name.trim()) {
      alert('Вкажіть назву сайту');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('site_settings').upsert({
      id: 1,
      site_name: settings.site_name.trim(),
      logo_url: settings.logo_url || null,
      favicon_url: settings.favicon_url || null,
      hero_title: settings.hero_title.trim() || null,
      hero_subtitle: settings.hero_subtitle.trim() || null,
      footer_text: settings.footer_text.trim() || null,
      meta_title: settings.meta_title.trim() || null,
      meta_description: settings.meta_description.trim() || null,
      og_image_url: settings.og_image_url || null,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      alert(error.message);
    } else {
      alert('Збережено');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-[#8893A2]">Завантаження…</div>
      </div>
    );
  }

  const inputClass = 'w-full border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]';

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Сайт</h1>
        <p className="text-[#8893A2] mt-1">Брендинг, тексти й SEO веб-версії маркетплейсу (coffeeone.com.ua)</p>
      </div>

      <div className="flex flex-col gap-5 max-w-xl">
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-3">Назва сайту</div>
          <input value={settings.site_name} onChange={(e) => set('site_name', e.target.value)} placeholder="Coffee One" className={inputClass} />
        </div>

        <UploadField
          label="Лого (шапка сайту)"
          hint="Без лого показується ☕ за замовчуванням"
          value={settings.logo_url}
          onChange={(v) => set('logo_url', v)}
          pathPrefix="site/logo"
          previewClassName="w-14 h-14 rounded-xl object-cover border border-[#E8EDF4]"
        />

        <UploadField
          label="Фавікон (іконка вкладки браузера)"
          hint="Рекомендовано квадратне зображення, напр. 512×512"
          value={settings.favicon_url}
          onChange={(v) => set('favicon_url', v)}
          pathPrefix="site/favicon"
          previewClassName="w-10 h-10 rounded-lg object-cover border border-[#E8EDF4]"
        />

        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-1">Заголовок і підзаголовок на сторінці маркетплейсу</div>
          <p className="text-[#8893A2] text-xs mb-3">Великий текст і опис під ним на головній сторінці сайту</p>
          <input value={settings.hero_title} onChange={(e) => set('hero_title', e.target.value)} placeholder="Маркетплейс" className={`${inputClass} mb-2`} />
          <input value={settings.hero_subtitle} onChange={(e) => set('hero_subtitle', e.target.value)} placeholder="Опис під заголовком" className={inputClass} />
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-1">Текст у підвалі сайту</div>
          <input value={settings.footer_text} onChange={(e) => set('footer_text', e.target.value)} className={inputClass} />
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
          <div className="font-bold text-[#20303C] mb-1">SEO</div>
          <p className="text-[#8893A2] text-xs mb-3">
            Заголовок і опис у пошуку Google та назва вкладки браузера. Для прев'ю в соцмережах (Facebook/Telegram)
            зображення нижче теж використовується, але саме прев'ю може не оновитись одразу — ці боти кешують сторінку.
          </p>
          <label className="text-xs font-bold text-[#546070] mb-1.5 block">Meta title</label>
          <input value={settings.meta_title} onChange={(e) => set('meta_title', e.target.value)} className={`${inputClass} mb-3`} />
          <label className="text-xs font-bold text-[#546070] mb-1.5 block">Meta description</label>
          <textarea value={settings.meta_description} onChange={(e) => set('meta_description', e.target.value)} rows={3} className={inputClass} />
        </div>

        <UploadField
          label="Зображення для прев'ю в соцмережах (Open Graph)"
          hint="Рекомендовано 1200×630"
          value={settings.og_image_url}
          onChange={(v) => set('og_image_url', v)}
          pathPrefix="site/og"
          previewClassName="w-24 h-14 rounded-lg object-cover border border-[#E8EDF4]"
        />

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
