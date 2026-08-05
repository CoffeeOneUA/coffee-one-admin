import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface AppContent {
  key: string;
  title: string;
  body: string;
  updated_at: string;
}

export default function ContentPage() {
  const [items, setItems] = useState<AppContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_content')
      .select('*')
      .order('key');

    if (!error) setItems(data ?? []);
    setLoading(false);
  }

  function openEditor(item: AppContent) {
    setActiveKey(item.key);
    setTitle(item.title);
    setBody(item.body);
  }

  async function handleSave() {
    if (!activeKey) return;
    setSaving(true);
    const { error } = await supabase
      .from('app_content')
      .update({ title, body, updated_at: new Date().toISOString() })
      .eq('key', activeKey);

    if (!error) {
      setItems((prev) =>
        prev.map((i) => (i.key === activeKey ? { ...i, title, body } : i))
      );
      setActiveKey(null);
    }
    setSaving(false);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Контент застосунку</h1>
        <p className="text-[#8893A2] mt-1">Тексти, які редагуються тут, одразу оновлюються в мобільному застосунку</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#8893A2] font-medium">Завантаження…</div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-[#8893A2]">Записів поки немає</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {items.map((item) => (
            <div
              key={item.key}
              className="bg-white rounded-2xl shadow-sm border border-[#E8EDF4] p-5"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="text-xs font-bold text-[#8893A2] uppercase tracking-widest">{item.key}</div>
                  <div className="font-bold text-[#20303C] text-lg mt-0.5">{item.title}</div>
                </div>
                <button
                  onClick={() => openEditor(item)}
                  className="bg-[#187FD8] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#1169B8] transition-all flex-shrink-0"
                >
                  Редагувати
                </button>
              </div>
              <p className="text-[#546070] text-sm leading-relaxed line-clamp-4">{item.body}</p>
            </div>
          ))}
        </div>
      )}

      {activeKey && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-[#20303C] mb-4">Редагування: {activeKey}</h2>

            <label className="block text-xs font-bold text-[#8893A2] uppercase tracking-widest mb-1.5">Заголовок</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-[#E8EDF4] rounded-xl px-3.5 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
            />

            <label className="block text-xs font-bold text-[#8893A2] uppercase tracking-widest mb-1.5">Текст</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full border border-[#E8EDF4] rounded-xl px-3.5 py-2.5 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-[#187FD8] resize-none"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setActiveKey(null)}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#546070] hover:bg-gray-50 border border-[#E8EDF4]"
              >
                Скасувати
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
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
