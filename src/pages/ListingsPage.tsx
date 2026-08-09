import { useEffect, useRef, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface Model { id: string; brand_id: string; name: string }

// Системний акаунт "Coffee One", яким адмінка публікує оголошення напряму
// (listings.user_id обов'язковий, а в адмінці немає власного покупця/
// продавця-людини для цього). Створений один раз через Auth Admin API.
const SYSTEM_SELLER_ID = '42c09412-c566-4c5d-8bd4-c127f0af4bb3';

interface Category { id: string; name: string; slug: string; emoji: string }
interface Brand { id: string; name: string }
interface City { id: string; name: string }

interface Listing {
  id: string;
  user_id: string;
  title: string;
  brand_id: string;
  category_id: string;
  price_usd: number;
  price_uah: number;
  condition: string;
  groups: number | null;
  year: number | null;
  city: string;
  description: string;
  photos: string[];
  status: string;
  sold_reason: string | null;
  is_coffee_one_seller: boolean;
  safe_payment_enabled: boolean;
  created_at: string;
  brands: { name: string } | null;
  categories: { name: string; slug: string } | null;
  profiles: { full_name: string | null } | null;
}

const EMPTY_FORM = {
  brand_id: '',
  category_id: '',
  model: '',
  price_usd: '',
  price_uah: '',
  condition: 'used',
  groups: '',
  year: '',
  city: '',
  description: '',
  status: 'approved',
  is_coffee_one_seller: true,
  safe_payment_enabled: false,
  photos: [] as string[],
};

const STATUS_LABEL: Record<string, string> = { pending: 'На модерації', approved: 'Активне', rejected: 'Відхилено', sold: 'Продано' };
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  sold: 'bg-gray-100 text-gray-500',
};

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

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'sold'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [customModel, setCustomModel] = useState(false);
  const skipModelResetRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  // Моделі відфільтровані по бренду — той самий патерн, що useModels у
  // мобільному/веб застосунку.
  useEffect(() => {
    if (!form.brand_id) {
      setModels([]);
      return;
    }
    supabase
      .from('models')
      .select('id, brand_id, name')
      .eq('brand_id', form.brand_id)
      .order('name')
      .then(({ data }) => setModels(data ?? []));
  }, [form.brand_id]);

  // Скидаємо модель при зміні бренду (крім автопідстановки при редагуванні).
  useEffect(() => {
    if (skipModelResetRef.current) {
      skipModelResetRef.current = false;
      return;
    }
    set('model', '');
    setCustomModel(false);
  }, [form.brand_id]);

  async function fetchAll() {
    setLoading(true);
    const [{ data: l }, { data: c }, { data: b }, { data: ci }] = await Promise.all([
      supabase.from('listings').select('*, brands(name), categories(name, slug), profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name, slug, emoji').order('name'),
      supabase.from('brands').select('id, name').order('name'),
      supabase.from('cities').select('id, name').order('sort_order'),
    ]);
    setListings(l ?? []);
    setCategories(c ?? []);
    setBrands(b ?? []);
    setCities(ci ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setCustomModel(false);
    setModalOpen(true);
  }

  function openEdit(l: Listing) {
    setEditingId(l.id);
    const model = l.title.startsWith(l.brands?.name ?? '\0') ? l.title.slice((l.brands?.name ?? '').length).trim() : l.title;
    // Модель з назви оголошення могла бути вписана вручну й не збігатись
    // точно з жодним варіантом у списку — показуємо як вільний текст.
    skipModelResetRef.current = true;
    setCustomModel(true);
    setForm({
      brand_id: l.brand_id ?? '',
      category_id: l.category_id ?? '',
      model,
      price_usd: String(l.price_usd ?? ''),
      price_uah: String(l.price_uah ?? ''),
      condition: l.condition ?? 'used',
      groups: l.groups != null ? String(l.groups) : '',
      year: l.year != null ? String(l.year) : '',
      city: l.city ?? '',
      description: l.description ?? '',
      status: l.status ?? 'approved',
      is_coffee_one_seller: !!l.is_coffee_one_seller,
      safe_payment_enabled: !!l.safe_payment_enabled,
      photos: l.photos ?? [],
    });
    setModalOpen(true);
  }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${SYSTEM_SELLER_ID}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('listings').upload(fileName, file, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from('listings').getPublicUrl(fileName);
        uploaded.push(data.publicUrl);
      }
      setForm((prev) => ({ ...prev, photos: [...prev.photos, ...uploaded] }));
    } catch (e: any) {
      alert(e.message ?? 'Не вдалося завантажити фото');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removePhoto(url: string) {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((p) => p !== url) }));
  }

  async function handleSave() {
    const brandName = brands.find((b) => b.id === form.brand_id)?.name;
    if (!brandName) return alert('Оберіть бренд');
    if (!form.model.trim()) return alert('Вкажіть модель');
    if (!form.category_id) return alert('Оберіть категорію');
    if (!form.price_uah || !form.price_usd) return alert('Вкажіть ціну');
    if (!form.city) return alert('Оберіть місто');

    setSaving(true);
    const payload = {
      title: `${brandName} ${form.model.trim()}`,
      brand_id: form.brand_id,
      category_id: form.category_id,
      price_usd: Number(form.price_usd),
      price_uah: Number(form.price_uah),
      condition: form.condition,
      groups: form.groups ? Number(form.groups) : null,
      year: form.year ? Number(form.year) : null,
      city: form.city,
      description: form.description.trim(),
      status: form.status,
      is_coffee_one_seller: form.is_coffee_one_seller,
      safe_payment_enabled: form.safe_payment_enabled,
      photos: form.photos,
    };

    const { error } = editingId
      ? await supabase.from('listings').update(payload).eq('id', editingId)
      : await supabase.from('listings').insert({ ...payload, user_id: SYSTEM_SELLER_ID });

    if (error) {
      alert(error.message);
    } else {
      setModalOpen(false);
      await fetchAll();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Видалити оголошення? Це неможливо відмінити.')) return;
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (!error) {
      setListings((prev) => prev.filter((l) => l.id !== id));
    } else {
      alert(error.message);
    }
  }

  async function toggleCoffeeOne(id: string, current: boolean) {
    const { error } = await supabase.from('listings').update({ is_coffee_one_seller: !current }).eq('id', id);
    if (!error) {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_coffee_one_seller: !current } : l)));
    } else {
      alert(error.message);
    }
  }

  const inputClass = 'w-full border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]';
  const selectedCategory = categories.find((c) => c.id === form.category_id);
  const filtered = filter === 'all' ? listings : listings.filter((l) => l.status === filter);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20303C]">Оголошення</h1>
          <p className="text-[#8893A2] mt-1">Усі оголошення маркетплейсу — можна додавати вручну від імені Coffee One</p>
        </div>
        <button onClick={openAdd} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8]">
          + Додати оголошення
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'approved', 'rejected', 'sold'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              filter === f ? 'bg-[#20303C] text-white shadow-lg' : 'bg-white text-[#8893A2] hover:bg-gray-50 border border-[#E8EDF4]'
            }`}
          >
            {f === 'all' ? 'Усі' : STATUS_LABEL[f]}
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
            <div className="text-5xl mb-3">🔍</div>
            <div className="text-xl font-bold text-[#20303C] mb-2">Оголошень немає</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((l) => (
            <div key={l.id} className="bg-white rounded-2xl shadow-sm border border-[#E8EDF4] overflow-hidden">
              <div className="h-44 bg-gradient-to-br from-[#dfe9f6] to-[#c3d4ea] relative flex items-center justify-center">
                {l.photos && l.photos.length > 0 ? (
                  <img src={l.photos[0]} alt={l.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl">☕</span>
                )}
                {l.is_coffee_one_seller && (
                  <div className="absolute top-0 left-0 right-0 bg-[#187FD8] text-white text-[11px] font-bold py-1 text-center">
                    ☕ Продавець Coffee One
                  </div>
                )}
                <span className={`absolute ${l.is_coffee_one_seller ? 'top-8' : 'top-2'} left-2 text-xs font-bold px-2 py-1 rounded-lg ${STATUS_COLOR[l.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LABEL[l.status] ?? l.status}
                </span>
                {l.safe_payment_enabled && (
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] font-bold px-2 py-1 rounded-lg">🔒 Безпечна оплата</span>
                )}
              </div>

              <div className="p-4">
                <div className="text-[#8893A2] text-xs font-semibold uppercase">{l.brands?.name} · {l.categories?.name}</div>
                <div className="font-bold text-[#20303C] text-base leading-tight mt-0.5">{l.title}</div>
                <div className="text-[#8893A2] text-sm mt-1">
                  {l.profiles?.full_name ?? 'Без імені'} · 📍 {l.city}
                </div>

                <div className="flex items-baseline gap-2 mt-2">
                  <span className="font-extrabold text-[#20303C] text-lg">{Number(l.price_uah).toLocaleString('uk-UA')} ₴</span>
                  <span className="text-[#8893A2] text-xs">≈ ${Number(l.price_usd).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between mt-3 py-3 border-t border-[#E8EDF4] mb-3">
                  <span className="text-xs font-semibold text-[#546070]">Стрічка «Продавець Coffee One»</span>
                  <Toggle on={l.is_coffee_one_seller} onChange={() => toggleCoffeeOne(l.id, l.is_coffee_one_seller)} />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => openEdit(l)} className="flex-1 bg-[#EAF2FC] hover:bg-[#dbe9fa] text-[#187FD8] font-bold py-2.5 rounded-xl text-sm transition-all">
                    Редагувати
                  </button>
                  <button onClick={() => handleDelete(l.id)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-bold py-2.5 rounded-xl text-sm transition-all border border-red-200">
                    Видалити
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !saving && setModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-extrabold text-[#20303C] mb-1">{editingId ? 'Редагувати оголошення' : 'Нове оголошення'}</h2>
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Закрити"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8893A2] hover:bg-[#F1F5FB] hover:text-[#546070] transition-all shrink-0 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
            {!editingId && (
              <p className="text-[#8893A2] text-xs mb-5">Публікується одразу від імені продавця «Coffee One», без модерації.</p>
            )}

            <div className="flex flex-col gap-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Категорія</label>
                  <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} className={inputClass}>
                    <option value="">Оберіть...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Бренд</label>
                  <select value={form.brand_id} onChange={(e) => set('brand_id', e.target.value)} className={inputClass}>
                    <option value="">Оберіть...</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Модель</label>
                {models.length > 0 && !customModel ? (
                  <>
                    <select value={form.model} onChange={(e) => set('model', e.target.value)} className={inputClass}>
                      <option value="">Оберіть модель</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setCustomModel(true); set('model', ''); }}
                      className="text-xs font-semibold text-[#187FD8] mt-1.5"
                    >
                      Немає в списку — вписати вручну
                    </button>
                  </>
                ) : (
                  <>
                    <input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Напр. Linea PB" className={inputClass} />
                    {models.length > 0 && (
                      <button type="button" onClick={() => setCustomModel(false)} className="text-xs font-semibold text-[#187FD8] mt-1.5">
                        ← Обрати зі списку
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Ціна, ₴</label>
                  <input value={form.price_uah} onChange={(e) => set('price_uah', e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Ціна, $ (довідково)</label>
                  <input value={form.price_usd} onChange={(e) => set('price_usd', e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Стан</label>
                  <select value={form.condition} onChange={(e) => set('condition', e.target.value)} className={inputClass}>
                    <option value="new">Нове</option>
                    <option value="used">Вживане</option>
                    <option value="parts">На запчастини</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Місто</label>
                  <select value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass}>
                    <option value="">Оберіть...</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedCategory?.slug === 'machines' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#546070] mb-1.5 block">Групи</label>
                    <input value={form.groups} onChange={(e) => set('groups', e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#546070] mb-1.5 block">Рік</label>
                    <input value={form.year} onChange={(e) => set('year', e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" className={inputClass} />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Опис</label>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} className={inputClass} />
              </div>

              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Фото</label>
                {form.photos.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-2">
                    {form.photos.map((url) => (
                      <div key={url} className="relative w-20 h-20">
                        <img src={url} className="w-full h-full object-cover rounded-lg border border-[#E8EDF4]" alt="" />
                        <button onClick={() => removePhoto(url)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleUpload(e.target.files)} disabled={uploading} className="text-sm" />
                {uploading && <div className="text-xs text-[#8893A2] mt-1">Завантаження…</div>}
              </div>

              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Статус</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputClass}>
                  <option value="approved">Активне (одразу на маркетплейсі)</option>
                  <option value="pending">На модерації</option>
                  <option value="rejected">Відхилено</option>
                  <option value="sold">Продано</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-semibold text-[#20303C]">Стрічка «Продавець Coffee One»</div>
                  <div className="text-[#8893A2] text-xs mt-0.5">Показується зверху фото на картці оголошення</div>
                </div>
                <Toggle on={form.is_coffee_one_seller} onChange={(v) => set('is_coffee_one_seller', v)} />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[#E8EDF4]">
                <div>
                  <div className="text-sm font-semibold text-[#20303C]">🔒 Позначка «Безпечна оплата»</div>
                  <div className="text-[#8893A2] text-xs mt-0.5">
                    Бейдж на картці оголошення. Саму кнопку «Купити з безпечною доставкою» бачать усі покупці незалежно від цього — покупець вмикає й оплачує її сам.
                  </div>
                </div>
                <Toggle on={form.safe_payment_enabled} onChange={(v) => set('safe_payment_enabled', v)} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#F1F5FB] text-[#546070] hover:bg-[#e4ebf5]">
                Скасувати
              </button>
              <button onClick={handleSave} disabled={saving || uploading} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50">
                {saving ? 'Збереження…' : 'Зберегти'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
