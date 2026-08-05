import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface City {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchCities();
  }, []);

  async function fetchCities() {
    setLoading(true);
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('sort_order');

    if (!error) setCities(data ?? []);
    setLoading(false);
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const maxOrder = cities.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const { data, error } = await supabase
      .from('cities')
      .insert({ name, sort_order: maxOrder + 1 })
      .select()
      .single();

    if (!error && data) {
      setCities((prev) => [...prev, data]);
      setNewName('');
    }
    setAdding(false);
  }

  async function toggleActive(city: City) {
    const { error } = await supabase
      .from('cities')
      .update({ is_active: !city.is_active })
      .eq('id', city.id);

    if (!error) {
      setCities((prev) =>
        prev.map((c) => (c.id === city.id ? { ...c, is_active: !c.is_active } : c))
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Видалити місто?')) return;
    const { error } = await supabase.from('cities').delete().eq('id', id);
    if (!error) setCities((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Міста</h1>
        <p className="text-[#8893A2] mt-1">Список міст, доступний для вибору в мобільному застосунку</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5 mb-6 flex gap-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Назва міста"
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
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden">
          {cities.map((city, i) => (
            <div
              key={city.id}
              className={`flex items-center justify-between px-5 py-3.5 ${
                i !== cities.length - 1 ? 'border-b border-[#E8EDF4]' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📍</span>
                <span className="font-semibold text-[#20303C]">{city.name}</span>
                {!city.is_active && (
                  <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">
                    Вимкнено
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(city)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    city.is_active
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {city.is_active ? 'Активне' : 'Увімкнути'}
                </button>
                <button
                  onClick={() => handleDelete(city.id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                >
                  Видалити
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
