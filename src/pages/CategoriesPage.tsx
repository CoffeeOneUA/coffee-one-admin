import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  safe_delivery_fee_uah: number | null;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '');
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('☕');
  const [adding, setAdding] = useState(false);
  const [feeDrafts, setFeeDrafts] = useState<Record<string, string>>({});
  const [savingFeeId, setSavingFeeId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (!error) {
      setCategories(data ?? []);
      const drafts: Record<string, string> = {};
      for (const c of data ?? []) drafts[c.id] = c.safe_delivery_fee_uah != null ? String(c.safe_delivery_fee_uah) : '0';
      setFeeDrafts(drafts);
    }
    setLoading(false);
  }

  async function saveFee(id: string) {
    const fee = Number(feeDrafts[id]?.replace(/[^\d.]/g, '')) || 0;
    setSavingFeeId(id);
    const { error } = await supabase.from('categories').update({ safe_delivery_fee_uah: fee }).eq('id', id);
    setSavingFeeId(null);
    if (error) {
      alert(error.message);
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, safe_delivery_fee_uah: fee } : c)));
    setFeeDrafts((prev) => ({ ...prev, [id]: String(fee) }));
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, slug: slugify(name), emoji: newEmoji.trim() || '☕' })
      .select()
      .single();

    if (!error && data) {
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setNewEmoji('☕');
    } else if (error) {
      alert(error.message);
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Видалити категорію? Це можливо, тільки якщо на неї не посилаються жодні товари чи оголошення.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert('Не вдалося видалити — категорія використовується товарами або оголошеннями.');
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Категорії</h1>
        <p className="text-[#8893A2] mt-1">
          Доступні для вибору при створенні товару в адмінці та оголошення в застосунку
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5 mb-6 flex gap-3">
        <input
          value={newEmoji}
          onChange={(e) => setNewEmoji(e.target.value)}
          placeholder="☕"
          className="w-16 border border-[#E8EDF4] rounded-xl px-3.5 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
        />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Назва категорії"
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
      ) : categories.length === 0 ? (
        <div className="text-[#8893A2]">Категорій ще немає</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden">
          {categories.map((c, i) => (
            <div
              key={c.id}
              className={`flex items-center justify-between px-5 py-3.5 ${
                i !== categories.length - 1 ? 'border-b border-[#E8EDF4]' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{c.emoji}</span>
                <span className="font-semibold text-[#20303C]">{c.name}</span>
                <span className="text-[#8893A2] text-xs">{c.slug}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-[#8893A2] whitespace-nowrap">🚚 Безпечна доставка</label>
                  <input
                    value={feeDrafts[c.id] ?? '0'}
                    onChange={(e) => setFeeDrafts((prev) => ({ ...prev, [c.id]: e.target.value.replace(/[^\d.]/g, '') }))}
                    inputMode="decimal"
                    className="w-20 border border-[#E8EDF4] rounded-lg px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
                  />
                  <span className="text-xs text-[#8893A2]">₴</span>
                  {feeDrafts[c.id] !== String(c.safe_delivery_fee_uah ?? 0) && (
                    <button
                      onClick={() => saveFee(c.id)}
                      disabled={savingFeeId === c.id}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
                    >
                      {savingFeeId === c.id ? '…' : 'Зберегти'}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
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
