import { useEffect, useRef, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string;
}

interface Brand {
  id: string;
  name: string;
}

interface ModelOption {
  id: string;
  brand_id: string;
  name: string;
}

interface Blogger {
  id: string;
  name: string;
  nickname: string | null;
}

interface RecommendationDraft {
  id: string | null;
  blogger_id: string;
  reason: string;
}

interface Product {
  id: string;
  title: string;
  brand_id: string | null;
  category_id: string | null;
  model_id: string | null;
  price_usd: number;
  price_uah: number;
  condition: string;
  groups: number | null;
  year: number | null;
  boiler: string | null;
  warranty_months: number | null;
  description: string | null;
  in_stock: boolean;
  stock_count: number;
  is_featured: boolean;
  is_hit: boolean;
  is_coffee_one_seller: boolean;
  credit_available: boolean;
  photos: string[];
  brands: { name: string } | null;
  categories: { name: string; slug: string } | null;
  models: { name: string } | null;
}

const EMPTY_FORM = {
  title: '',
  brand_id: '',
  category_id: '',
  model_id: '',
  price_usd: '',
  price_uah: '',
  condition: 'new',
  groups: '',
  year: '',
  boiler: '',
  warranty_months: '',
  description: '',
  in_stock: true,
  stock_count: '0',
  is_featured: false,
  is_hit: false,
  is_coffee_one_seller: true,
  credit_available: false,
  photos: [] as string[],
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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [bloggers, setBloggers] = useState<Blogger[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [recommendations, setRecommendations] = useState<RecommendationDraft[]>([]);
  const [draftBloggerId, setDraftBloggerId] = useState('');
  const [draftReason, setDraftReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draggedPhoto, setDraggedPhoto] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: p }, { data: c }, { data: b }, { data: m }, { data: bl }] = await Promise.all([
      supabase.from('products').select('*, brands(name), categories(name, slug), models(name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name, slug, emoji').order('name'),
      supabase.from('brands').select('id, name').order('name'),
      supabase.from('models').select('id, brand_id, name').order('name'),
      supabase.from('bloggers').select('id, name, nickname').order('name'),
    ]);
    setProducts(p ?? []);
    setCategories(c ?? []);
    setBrands(b ?? []);
    setModels(m ?? []);
    setBloggers(bl ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setRecommendations([]);
    setDraftBloggerId('');
    setDraftReason('');
    setModalOpen(true);
  }

  async function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      title: p.title ?? '',
      brand_id: p.brand_id ?? '',
      category_id: p.category_id ?? '',
      model_id: p.model_id ?? '',
      price_usd: String(p.price_usd ?? ''),
      price_uah: String(p.price_uah ?? ''),
      condition: p.condition ?? 'new',
      groups: p.groups != null ? String(p.groups) : '',
      year: p.year != null ? String(p.year) : '',
      boiler: p.boiler ?? '',
      warranty_months: p.warranty_months != null ? String(p.warranty_months) : '',
      description: p.description ?? '',
      in_stock: !!p.in_stock,
      stock_count: String(p.stock_count ?? 0),
      is_featured: !!p.is_featured,
      is_hit: !!p.is_hit,
      is_coffee_one_seller: !!p.is_coffee_one_seller,
      credit_available: !!p.credit_available,
      photos: p.photos ?? [],
    });
    setDraftBloggerId('');
    setDraftReason('');

    // Чекаємо завантаження існуючих рекомендацій ДО відкриття модалки —
    // інакше є вікно, коли юзер встигає додати нову рекомендацію, а щойно
    // прийшла відповідь fetch (навіть порожня) перезаписує її стан.
    const { data, error } = await supabase
      .from('product_blogger_recommendations')
      .select('id, blogger_id, reason')
      .eq('product_id', p.id)
      .order('sort_order');
    if (error) alert(`Не вдалося завантажити рекомендації блогерів: ${error.message}`);
    setRecommendations((data ?? []).map((r) => ({ id: r.id, blogger_id: r.blogger_id, reason: r.reason ?? '' })));

    setModalOpen(true);
  }

  function addRecommendation() {
    if (!draftBloggerId) return;
    setRecommendations((prev) => [...prev, { id: null, blogger_id: draftBloggerId, reason: draftReason.trim() }]);
    setDraftBloggerId('');
    setDraftReason('');
  }

  function removeRecommendation(index: number) {
    setRecommendations((prev) => prev.filter((_, i) => i !== index));
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
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('products').upload(fileName, file, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from('products').getPublicUrl(fileName);
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

  function reorderPhotos(from: number, to: number) {
    if (from === to) return;
    setForm((prev) => {
      const photos = [...prev.photos];
      const [moved] = photos.splice(from, 1);
      photos.splice(to, 0, moved);
      return { ...prev, photos };
    });
  }

  async function handleSave() {
    if (!form.title.trim()) {
      alert('Вкажіть назву товару');
      return;
    }
    if (!form.category_id) {
      alert('Оберіть категорію');
      return;
    }
    if (!form.brand_id) {
      alert('Оберіть бренд');
      return;
    }
    if (!form.price_usd || !form.price_uah) {
      alert('Вкажіть ціну');
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      brand_id: form.brand_id,
      category_id: form.category_id,
      model_id: form.model_id || null,
      price_usd: Number(form.price_usd),
      price_uah: Number(form.price_uah),
      condition: form.condition,
      groups: form.groups ? Number(form.groups) : null,
      year: form.year ? Number(form.year) : null,
      boiler: form.boiler.trim() || null,
      warranty_months: form.warranty_months ? Number(form.warranty_months) : null,
      description: form.description.trim(),
      in_stock: form.in_stock,
      stock_count: Number(form.stock_count) || 0,
      is_featured: form.is_featured,
      is_hit: form.is_hit,
      is_coffee_one_seller: form.is_coffee_one_seller,
      credit_available: form.credit_available,
      photos: form.photos,
    };

    const { data: saved, error } = editingId
      ? await supabase.from('products').update(payload).eq('id', editingId).select().single()
      : await supabase.from('products').insert(payload).select().single();

    if (error || !saved) {
      alert(error?.message ?? 'Не вдалося зберегти товар');
      setSaving(false);
      return;
    }

    // Якщо блогера обрали, але забули натиснути "+ Додати рекомендацію" —
    // все одно враховуємо цей чернетковий рядок при збереженні, а не
    // мовчки губимо його.
    const allRecommendations = draftBloggerId
      ? [...recommendations.filter((r) => r.blogger_id !== draftBloggerId), { id: null, blogger_id: draftBloggerId, reason: draftReason.trim() }]
      : recommendations;

    // Рекомендації блогерів — просто перезаписуємо повністю під цей товар,
    // список невеликий, диф не потрібен.
    const { error: delError } = await supabase.from('product_blogger_recommendations').delete().eq('product_id', saved.id);
    if (delError) {
      alert(`Товар збережено, але не вдалося оновити рекомендації блогерів: ${delError.message}`);
      setSaving(false);
      setModalOpen(false);
      await fetchAll();
      return;
    }
    if (allRecommendations.length > 0) {
      const { error: recError } = await supabase.from('product_blogger_recommendations').insert(
        allRecommendations.map((r, i) => ({
          product_id: saved.id,
          blogger_id: r.blogger_id,
          reason: r.reason.trim() || null,
          sort_order: i,
        }))
      );
      if (recError) {
        alert(`Товар збережено, але не вдалося зберегти рекомендації блогерів: ${recError.message}`);
        setSaving(false);
        setModalOpen(false);
        await fetchAll();
        return;
      }
    }

    setModalOpen(false);
    await fetchAll();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Видалити товар? Це неможливо відмінити.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert('Не вдалося видалити — товар використовується в замовленнях або кошиках.');
    }
  }

  async function toggleField(
    id: string,
    field: 'in_stock' | 'is_featured' | 'is_hit' | 'is_coffee_one_seller' | 'credit_available',
    current: boolean
  ) {
    const { error } = await supabase.from('products').update({ [field]: !current }).eq('id', id);
    if (!error) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: !current } : p)));
    } else {
      alert(error.message);
    }
  }

  const inputClass = 'w-full border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]';
  const selectedCategory = categories.find((c) => c.id === form.category_id);
  const modelsForBrand = models.filter((m) => m.brand_id === form.brand_id);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20303C]">Товари</h1>
          <p className="text-[#8893A2] mt-1">Каталог магазину Coffee One — відображається в мобільному застосунку</p>
        </div>
        <button onClick={openAdd} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8]">
          + Додати товар
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#8893A2] font-medium">Завантаження…</div>
        </div>
      ) : products.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-5xl mb-3">🛍</div>
            <div className="text-xl font-bold text-[#20303C] mb-2">Товарів ще немає</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-[#E8EDF4] overflow-hidden">
              <div className="h-44 bg-gradient-to-br from-[#dfe9f6] to-[#c3d4ea] relative flex items-center justify-center">
                {p.photos && p.photos.length > 0 ? (
                  <img src={p.photos[0]} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl">☕</span>
                )}
                {p.is_coffee_one_seller && (
                  <div className="absolute top-0 left-0 right-0 bg-[#187FD8] text-white text-[11px] font-bold py-1 text-center">
                    ☕ Продавець Coffee One
                  </div>
                )}
                <div className={`absolute left-2 flex gap-1.5 ${p.is_coffee_one_seller ? 'top-8' : 'top-2'}`}>
                  {p.is_hit && <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-lg">Хіт</span>}
                  {p.is_featured && <span className="bg-[#187FD8] text-white text-xs font-bold px-2 py-1 rounded-lg">⭐ Топ</span>}
                  {!p.in_stock && <span className="bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-lg">Немає в наявності</span>}
                </div>
              </div>

              <div className="p-4">
                <div className="text-[#8893A2] text-xs font-semibold uppercase">
                  {p.brands?.name}{p.models?.name ? ` · ${p.models.name}` : ''}
                </div>
                <div className="font-bold text-[#20303C] text-base leading-tight mt-0.5">{p.title}</div>
                <div className="text-[#8893A2] text-sm mt-1">{p.categories?.name}</div>

                <div className="flex items-baseline gap-2 mt-2">
                  <span className="font-extrabold text-[#20303C] text-lg">{Number(p.price_uah).toLocaleString('uk-UA')} ₴</span>
                  <span className="text-[#8893A2] text-xs">≈ ${Number(p.price_usd).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between mt-3 py-3 border-t border-[#E8EDF4]">
                  <span className="text-xs font-semibold text-[#546070]">В наявності ({p.stock_count})</span>
                  <Toggle on={p.in_stock} onChange={() => toggleField(p.id, 'in_stock', p.in_stock)} />
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs font-semibold text-[#546070]">Топ продаж</span>
                  <Toggle on={p.is_featured} onChange={() => toggleField(p.id, 'is_featured', p.is_featured)} />
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs font-semibold text-[#546070]">Хіт</span>
                  <Toggle on={p.is_hit} onChange={() => toggleField(p.id, 'is_hit', p.is_hit)} />
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs font-semibold text-[#546070]">Стрічка «Продавець Coffee One»</span>
                  <Toggle
                    on={p.is_coffee_one_seller}
                    onChange={() => toggleField(p.id, 'is_coffee_one_seller', p.is_coffee_one_seller)}
                  />
                </div>
                <div className="flex items-center justify-between py-1.5 mb-3">
                  <span className="text-xs font-semibold text-[#546070]">Кредит/лізинг доступний</span>
                  <Toggle
                    on={p.credit_available}
                    onChange={() => toggleField(p.id, 'credit_available', p.credit_available)}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 bg-[#EAF2FC] hover:bg-[#dbe9fa] text-[#187FD8] font-bold py-2.5 rounded-xl text-sm transition-all"
                  >
                    Редагувати
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-bold py-2.5 rounded-xl text-sm transition-all border border-red-200"
                  >
                    Видалити
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => !saving && setModalOpen(false)}
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold text-[#20303C] mb-5">{editingId ? 'Редагувати товар' : 'Новий товар'}</h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Назва товару</label>
                <input
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Напр. La Marzocco Linea Mini"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Категорія</label>
                  <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} className={inputClass}>
                    <option value="">Оберіть...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Бренд</label>
                  <select
                    value={form.brand_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, brand_id: e.target.value, model_id: '' }))}
                    className={inputClass}
                  >
                    <option value="">Оберіть...</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {form.brand_id && (
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Модель</label>
                  {modelsForBrand.length === 0 ? (
                    <p className="text-[#8893A2] text-xs">
                      У цього бренду ще немає моделей — додайте в розділі «Моделі».
                    </p>
                  ) : (
                    <select value={form.model_id} onChange={(e) => set('model_id', e.target.value)} className={inputClass}>
                      <option value="">Без моделі</option>
                      {modelsForBrand.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Ціна, ₴</label>
                  <input
                    value={form.price_uah}
                    onChange={(e) => set('price_uah', e.target.value.replace(/[^\d.]/g, ''))}
                    inputMode="decimal"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Ціна, $ (довідково)</label>
                  <input
                    value={form.price_usd}
                    onChange={(e) => set('price_usd', e.target.value.replace(/[^\d.]/g, ''))}
                    inputMode="decimal"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Стан</label>
                  <select value={form.condition} onChange={(e) => set('condition', e.target.value)} className={inputClass}>
                    <option value="new">Нове</option>
                    <option value="used">Вживане</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#546070] mb-1.5 block">Кількість на складі</label>
                  <input
                    value={form.stock_count}
                    onChange={(e) => set('stock_count', e.target.value.replace(/[^\d]/g, ''))}
                    inputMode="numeric"
                    className={inputClass}
                  />
                </div>
              </div>

              {selectedCategory?.slug === 'machines' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#546070] mb-1.5 block">Групи</label>
                    <input
                      value={form.groups}
                      onChange={(e) => set('groups', e.target.value.replace(/[^\d]/g, ''))}
                      inputMode="numeric"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#546070] mb-1.5 block">Бойлер</label>
                    <input value={form.boiler} onChange={(e) => set('boiler', e.target.value)} placeholder="Напр. Подвійний" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#546070] mb-1.5 block">Рік</label>
                    <input
                      value={form.year}
                      onChange={(e) => set('year', e.target.value.replace(/[^\d]/g, ''))}
                      inputMode="numeric"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Гарантія, місяців</label>
                <input
                  value={form.warranty_months}
                  onChange={(e) => set('warranty_months', e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  className={`${inputClass} max-w-[160px]`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Опис</label>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} className={inputClass} />
              </div>

              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Фото</label>
                {form.photos.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-2">
                    <p className="w-full text-[11px] text-[#8893A2] -mt-1 mb-0.5">Перетягніть фото, щоб змінити порядок</p>
                    {form.photos.map((url, i) => (
                      <div
                        key={url}
                        draggable
                        onDragStart={() => setDraggedPhoto(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedPhoto !== null) reorderPhotos(draggedPhoto, i);
                          setDraggedPhoto(null);
                        }}
                        onDragEnd={() => setDraggedPhoto(null)}
                        className={`relative w-20 h-20 cursor-grab active:cursor-grabbing ${draggedPhoto === i ? 'opacity-40' : ''}`}
                      >
                        <img src={url} className="w-full h-full object-cover rounded-lg border border-[#E8EDF4] pointer-events-none" alt="" />
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Головне</span>
                        )}
                        <button
                          onClick={() => removePhoto(url)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleUpload(e.target.files)}
                  disabled={uploading}
                  className="text-sm"
                />
                {uploading && <div className="text-xs text-[#8893A2] mt-1">Завантаження…</div>}
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-semibold text-[#20303C]">В наявності</span>
                <Toggle on={form.in_stock} onChange={(v) => set('in_stock', v)} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-semibold text-[#20303C]">Топ продаж (виділяється на екрані магазину)</span>
                <Toggle on={form.is_featured} onChange={(v) => set('is_featured', v)} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-semibold text-[#20303C]">Хіт (бейдж на картці)</span>
                <Toggle on={form.is_hit} onChange={(v) => set('is_hit', v)} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-semibold text-[#20303C]">Стрічка «Продавець Coffee One»</div>
                  <div className="text-[#8893A2] text-xs mt-0.5">Показується зверху фото на картці товару</div>
                </div>
                <Toggle on={form.is_coffee_one_seller} onChange={(v) => set('is_coffee_one_seller', v)} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="text-sm font-semibold text-[#20303C]">Доступність кредиту/лізингу</div>
                <Toggle on={form.credit_available} onChange={(v) => set('credit_available', v)} />
              </div>

              <div className="border-t border-[#E8EDF4] pt-4 mt-1">
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Рекомендації блогерів</label>

                {recommendations.length > 0 && (
                  <div className="flex flex-col gap-2 mb-3">
                    {recommendations.map((r, i) => {
                      const b = bloggers.find((x) => x.id === r.blogger_id);
                      return (
                        <div key={i} className="flex items-start gap-2 bg-[#F1F5FB] rounded-lg p-3">
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-[#20303C]">
                              {b?.name ?? '—'}{b?.nickname ? ` (@${b.nickname})` : ''}
                            </div>
                            {r.reason && <div className="text-xs text-[#546070] mt-1">{r.reason}</div>}
                          </div>
                          <button
                            onClick={() => removeRecommendation(i)}
                            className="text-red-400 hover:text-red-600 font-bold text-sm flex-shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {bloggers.length === 0 ? (
                  <p className="text-[#8893A2] text-xs">Блогерів ще немає — додайте в розділі «Блогери».</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <select value={draftBloggerId} onChange={(e) => setDraftBloggerId(e.target.value)} className={inputClass}>
                      <option value="">Оберіть блогера…</option>
                      {bloggers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}{b.nickname ? ` (@${b.nickname})` : ''}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={draftReason}
                      onChange={(e) => setDraftReason(e.target.value)}
                      placeholder="Чому блогер це рекомендує…"
                      rows={2}
                      className={inputClass}
                    />
                    <button
                      onClick={addRecommendation}
                      disabled={!draftBloggerId}
                      className="px-4 py-2 rounded-lg text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50 self-start"
                    >
                      + Додати рекомендацію
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#F1F5FB] text-[#546070] hover:bg-[#e4ebf5]"
              >
                Скасувати
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
              >
                {saving ? 'Збереження…' : 'Зберегти'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
