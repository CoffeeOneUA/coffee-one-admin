import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface Brand {
  id: string;
  name: string;
}

interface Model {
  id: string;
  brand_id: string;
  name: string;
}

export default function ModelsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) fetchModels(selectedBrand);
  }, [selectedBrand]);

  async function fetchBrands() {
    const { data } = await supabase.from('brands').select('id, name').order('name');
    setBrands(data ?? []);
    if (data && data.length > 0) setSelectedBrand(data[0].id);
    setLoading(false);
  }

  async function fetchModels(brandId: string) {
    const { data } = await supabase.from('models').select('*').eq('brand_id', brandId).order('name');
    setModels(data ?? []);
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name || !selectedBrand) return;
    setAdding(true);
    const { data, error } = await supabase
      .from('models')
      .insert({ brand_id: selectedBrand, name })
      .select()
      .single();

    if (!error && data) {
      setModels((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
    } else if (error) {
      alert(error.message);
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Видалити модель?')) return;
    const { error } = await supabase.from('models').delete().eq('id', id);
    if (!error) setModels((prev) => prev.filter((m) => m.id !== id));
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
        <h1 className="text-2xl font-extrabold text-[#20303C]">Моделі</h1>
        <p className="text-[#8893A2] mt-1">
          Моделі обладнання для кожного бренду. З'являються для вибору в оголошенні в застосунку —
          якщо потрібної моделі немає в списку, людина вписує назву вручну.
        </p>
      </div>

      {brands.length === 0 ? (
        <div className="text-[#8893A2]">Спочатку додай бренди в розділі "Бренди"</div>
      ) : (
        <>
          <div className="mb-5 max-w-md">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full border border-[#E8EDF4] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5 mb-6 flex gap-3 max-w-md">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Назва моделі (напр. Linea PB)"
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

          {models.length === 0 ? (
            <div className="text-[#8893A2]">Моделей для цього бренду ще немає</div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden max-w-md">
              {models.map((m, i) => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between px-5 py-3.5 ${
                    i !== models.length - 1 ? 'border-b border-[#E8EDF4]' : ''
                  }`}
                >
                  <span className="font-semibold text-[#20303C]">{m.name}</span>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                  >
                    Видалити
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
