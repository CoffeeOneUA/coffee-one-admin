import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface ServiceCenter {
  id: string;
  city: string;
  name: string;
  type: string | null;
  phone: string | null;
  allow_call: boolean;
}

const EMPTY_FORM = {
  city: '',
  name: '',
  type: '',
  phone: '',
  allow_call: false,
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
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

export default function ServiceCentersPage() {
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase.from('service_centers').select('*').order('city');
    setCenters(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(c: ServiceCenter) {
    setEditingId(c.id);
    setForm({
      city: c.city ?? '',
      name: c.name ?? '',
      type: c.type ?? '',
      phone: c.phone ?? '',
      allow_call: c.allow_call,
    });
    setModalOpen(true);
  }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.city.trim() || !form.name.trim()) {
      alert('Вкажіть місто і назву сервісного центру');
      return;
    }

    setSaving(true);
    const payload = {
      city: form.city.trim(),
      name: form.name.trim(),
      type: form.type.trim() || null,
      phone: form.phone.trim() || null,
      allow_call: form.allow_call,
    };

    const { error } = editingId
      ? await supabase.from('service_centers').update(payload).eq('id', editingId)
      : await supabase.from('service_centers').insert(payload);

    if (error) {
      alert(error.message);
    } else {
      setModalOpen(false);
      await fetchAll();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Видалити сервісний центр?')) return;
    const { error } = await supabase.from('service_centers').delete().eq('id', id);
    if (!error) {
      setCenters((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert(error.message);
    }
  }

  const inputClass = 'w-full border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]';

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20303C]">Сервісні центри</h1>
          <p className="text-[#8893A2] mt-1">Список сервісних центрів по містах для розділу "Ще" в застосунку</p>
        </div>
        <button onClick={openAdd} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8]">
          + Додати центр
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#8893A2] font-medium">Завантаження…</div>
        </div>
      ) : centers.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-5xl mb-3">🧰</div>
            <div className="text-xl font-bold text-[#20303C] mb-2">Сервісних центрів ще немає</div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden">
          {centers.map((c, i) => (
            <div key={c.id} className={`p-5 flex items-center justify-between gap-4 ${i !== centers.length - 1 ? 'border-b border-[#E8EDF4]' : ''}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[#8893A2] uppercase tracking-widest">{c.city}</span>
                  {c.allow_call && c.phone && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Дзвінки увімкнено</span>
                  )}
                </div>
                <div className="font-bold text-[#20303C]">{c.name}</div>
                <div className="text-[#546070] text-sm mt-0.5">
                  {c.type && <span>{c.type}</span>}
                  {c.type && c.phone && <span> · </span>}
                  {c.phone && <span>{c.phone}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(c)} className="bg-[#EAF2FC] hover:bg-[#dbe9fa] text-[#187FD8] font-bold px-4 py-2 rounded-xl text-sm transition-all">
                  Редагувати
                </button>
                <button onClick={() => handleDelete(c.id)} className="bg-red-50 hover:bg-red-100 text-red-500 font-bold px-4 py-2 rounded-xl text-sm transition-all border border-red-200">
                  Видалити
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !saving && setModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold text-[#20303C] mb-5">{editingId ? 'Редагувати центр' : 'Новий сервісний центр'}</h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Місто</label>
                <input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Напр. Дніпро" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Назва</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Напр. Coffee One Service" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Тип сервісного центру</label>
                <input value={form.type} onChange={(e) => set('type', e.target.value)} placeholder="Напр. Офіційний сервіс" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Телефон</label>
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+380…" className={inputClass} />
              </div>
              <div className="flex items-center justify-between bg-[#F8FAFD] rounded-xl px-4 py-3">
                <div>
                  <div className="font-bold text-[#20303C] text-sm">Можна дзвонити</div>
                  <div className="text-[#8893A2] text-xs mt-0.5">В застосунку зʼявиться кнопка "Подзвонити"</div>
                </div>
                <Toggle on={form.allow_call} onChange={(v) => set('allow_call', v)} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#F1F5FB] text-[#546070] hover:bg-[#e4ebf5]">
                Скасувати
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50">
                {saving ? 'Збереження…' : 'Зберегти'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
