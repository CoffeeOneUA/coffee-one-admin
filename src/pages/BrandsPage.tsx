import { useEffect, useRef, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  show_on_home: boolean;
  home_sort_order: number;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '');
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

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brandCategoryIds, setBrandCategoryIds] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: brandsData }, { data: categoriesData }, { data: linksData }] = await Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase.from('categories').select('id, name, emoji').order('name'),
      supabase.from('brand_categories').select('brand_id, category_id'),
    ]);
    setBrands(brandsData ?? []);
    setCategories(categoriesData ?? []);

    const map: Record<string, Set<string>> = {};
    for (const row of linksData ?? []) {
      if (!map[row.brand_id]) map[row.brand_id] = new Set();
      map[row.brand_id].add(row.category_id);
    }
    setBrandCategoryIds(map);
    setLoading(false);
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const { data, error } = await supabase
      .from('brands')
      .insert({ name, slug: slugify(name) })
      .select()
      .single();

    if (!error && data) {
      setBrands((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
    } else if (error) {
      alert(error.message);
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Видалити бренд? Це можливо, тільки якщо на нього не посилаються жодні товари чи оголошення.')) return;
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (!error) {
      setBrands((prev) => prev.filter((b) => b.id !== id));
    } else {
      alert('Не вдалося видалити — бренд використовується товарами або оголошеннями.');
    }
  }

  async function toggleCategory(brandId: string, categoryId: string) {
    const current = brandCategoryIds[brandId] ?? new Set<string>();
    const isOn = current.has(categoryId);

    const { error } = isOn
      ? await supabase.from('brand_categories').delete().eq('brand_id', brandId).eq('category_id', categoryId)
      : await supabase.from('brand_categories').insert({ brand_id: brandId, category_id: categoryId });

    if (error) {
      alert(`Не вдалось зберегти: ${error.message}`);
      return;
    }

    // Оновлюємо стан на екрані тільки після підтвердженого запису в базу —
    // інакше при невдалому запиті вибір "зникає" після оновлення сторінки.
    setBrandCategoryIds((prev) => {
      const next = { ...prev };
      const set = new Set(next[brandId] ?? []);
      if (isOn) set.delete(categoryId);
      else set.add(categoryId);
      next[brandId] = set;
      return next;
    });
  }

  async function updateBrandField(id: string, patch: Partial<Brand>) {
    const { data, error } = await supabase.from('brands').update(patch).eq('id', id).select().single();
    if (error) {
      alert(`Не вдалось зберегти: ${error.message}`);
      return;
    }
    setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)));
  }

  async function handleLogoUpload(brandId: string, file: File | null) {
    if (!file) return;
    setUploadingId(brandId);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `brand-logos/${brandId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file, {
        contentType: file.type || 'image/png',
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName);
      await updateBrandField(brandId, { logo_url: urlData.publicUrl });
    } catch (e: any) {
      alert(e.message ?? 'Не вдалося завантажити лого');
    } finally {
      setUploadingId(null);
      const input = fileInputRefs.current[brandId];
      if (input) input.value = '';
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Бренди</h1>
        <p className="text-[#8893A2] mt-1">
          Доступні для вибору при створенні товару в адмінці та оголошення в застосунку. Познач
          категорії, до яких застосовується бренд — якщо не позначити жодної, бренд показується
          для всіх категорій. Лого + перемикач «На головній» керують блоком «Бренди» на головному
          екрані застосунку — тап по такому бренду там веде в магазин, відфільтрований саме на нього.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5 mb-6 flex gap-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Назва бренду"
          className="flex-1 border border-[#E8EDF4] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
        >
          + Додати
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#8893A2] font-medium">Завантаження…</div>
        </div>
      ) : brands.length === 0 ? (
        <div className="text-[#8893A2]">Брендів ще немає</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden">
          {brands.map((b, i) => {
            const tagged = brandCategoryIds[b.id] ?? new Set<string>();
            return (
              <div
                key={b.id}
                className={`px-5 py-3.5 ${i !== brands.length - 1 ? 'border-b border-[#E8EDF4]' : ''}`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#20303C]">{b.name}</span>
                    <span className="text-[#8893A2] text-xs">{b.slug}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                  >
                    Видалити
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-2.5 py-2.5 border-t border-b border-[#E8EDF4] bg-[#FAFBFD] -mx-5 px-5">
                  <div className="w-16 h-11 rounded-lg bg-white border border-[#E8EDF4] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-[#C7D6E8] text-xs">лого</span>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <input
                      ref={(el) => { fileInputRefs.current[b.id] = el; }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(b.id, e.target.files?.[0] ?? null)}
                      disabled={uploadingId === b.id}
                      className="text-xs w-40"
                    />
                    {uploadingId === b.id && <div className="text-[#8893A2] text-xs mt-0.5">Завантаження…</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-[#546070]">На головній</span>
                    <Toggle on={b.show_on_home} onChange={(v) => updateBrandField(b.id, { show_on_home: v })} />
                  </div>
                  {b.show_on_home && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold text-[#546070]">Порядок</span>
                      <input
                        type="number"
                        value={b.home_sort_order}
                        onChange={(e) => updateBrandField(b.id, { home_sort_order: Number(e.target.value) || 0 })}
                        className="w-16 border border-[#E8EDF4] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => {
                    const on = tagged.has(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCategory(b.id, c.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                          on
                            ? 'bg-[#187FD8] text-white border-[#187FD8]'
                            : 'bg-white text-[#8893A2] border-[#E8EDF4] hover:border-[#C7D6E8]'
                        }`}
                      >
                        {c.emoji} {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
