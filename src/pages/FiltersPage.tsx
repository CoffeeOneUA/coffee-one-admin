import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface FilterOption {
  id: string;
  group_id: string;
  label: string;
  value: string;
  sort_order: number;
}

interface FilterGroup {
  id: string;
  key: string;
  label: string;
  is_active: boolean;
  sort_order: number;
}

// Ключ фільтра має відповідати реальній колонці в products/listings — інакше
// нічого фільтрувати. Список підтримуваних ключів синхронний з
// FILTER_KEY_CONFIG в мобільному useCatalogSearch.ts.
//
// "brand" і "category" тут НЕМАЄ навмисно — вони тепер автоматичні в
// застосунку: тип бере дані напряму з розділу "Категорії", а бренд — з
// "Бренди" + прив'язки бренд↔категорія (там само, на сторінці "Бренди").
// Нічого вручну дублювати тут не потрібно.
const FIELD_KEYS: { key: string; label: string; hint: string }[] = [
  { key: 'condition', label: 'Стан (новий/б’в)', hint: 'Значення має бути "new" або "used".' },
  { key: 'groups', label: 'Кількість груп', hint: 'Значення — число (1, 2, 3…).' },
  { key: 'year', label: 'Рік випуску', hint: 'Значення — число (напр. 2021).' },
  { key: 'boiler', label: 'Тип бойлера (лише товари магазину)', hint: 'Значення має точно збігатись з текстом поля "Бойлер" товару.' },
  { key: 'warranty_months', label: 'Гарантія, місяців (лише товари магазину)', hint: 'Значення — число місяців (напр. 12).' },
];

export default function FiltersPage() {
  const [groups, setGroups] = useState<FilterGroup[]>([]);
  const [options, setOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOption, setNewOption] = useState<Record<string, { label: string; value: string }>>({});
  const [newGroupKey, setNewGroupKey] = useState('');
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const availableKeys = FIELD_KEYS.filter((f) => !groups.some((g) => g.key === f.key));

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: g }, { data: o }] = await Promise.all([
      supabase.from('filter_groups').select('*').order('sort_order'),
      supabase.from('filter_options').select('*').order('sort_order'),
    ]);
    setGroups(g ?? []);
    setOptions(o ?? []);
    setLoading(false);
  }

  async function handleCreateGroup() {
    if (!newGroupKey) return;
    setCreatingGroup(true);
    const field = FIELD_KEYS.find((f) => f.key === newGroupKey);
    const label = newGroupLabel.trim() || field?.label || newGroupKey;
    const maxOrder = groups.reduce((m, g) => Math.max(m, g.sort_order), 0);

    const { data, error } = await supabase
      .from('filter_groups')
      .insert({ key: newGroupKey, label, is_active: true, sort_order: maxOrder + 1 })
      .select()
      .single();

    if (!error && data) {
      setGroups((prev) => [...prev, data]);
      setNewGroupKey('');
      setNewGroupLabel('');
    } else if (error) {
      alert(error.message);
    }
    setCreatingGroup(false);
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm('Видалити цей фільтр разом з усіма його опціями?')) return;
    await supabase.from('filter_options').delete().eq('group_id', id);
    const { error } = await supabase.from('filter_groups').delete().eq('id', id);
    if (!error) {
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setOptions((prev) => prev.filter((o) => o.group_id !== id));
    }
  }

  async function toggleGroupActive(group: FilterGroup) {
    const { error } = await supabase
      .from('filter_groups')
      .update({ is_active: !group.is_active })
      .eq('id', group.id);
    if (!error) {
      setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, is_active: !g.is_active } : g)));
    }
  }

  async function handleAddOption(groupId: string) {
    const draft = newOption[groupId];
    if (!draft?.label?.trim() || !draft?.value?.trim()) return;

    const maxOrder = options.filter((o) => o.group_id === groupId).reduce((m, o) => Math.max(m, o.sort_order), 0);
    const { data, error } = await supabase
      .from('filter_options')
      .insert({ group_id: groupId, label: draft.label.trim(), value: draft.value.trim(), sort_order: maxOrder + 1 })
      .select()
      .single();

    if (!error && data) {
      setOptions((prev) => [...prev, data]);
      setNewOption((prev) => ({ ...prev, [groupId]: { label: '', value: '' } }));
    }
  }

  async function handleDeleteOption(id: string) {
    const { error } = await supabase.from('filter_options').delete().eq('id', id);
    if (!error) setOptions((prev) => prev.filter((o) => o.id !== id));
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
        <h1 className="text-2xl font-extrabold text-[#20303C]">Фільтри</h1>
        <p className="text-[#8893A2] mt-1">
          Групи та опції для фільтрів у пошуку застосунку. Фільтри «Тип» і «Бренд» сюди не входять —
          вони автоматичні: «Тип» бере дані з розділу «Категорії», а «Бренд» — з «Бренди»
          (звужується під обраний тип за прив'язками бренд↔категорія там само).
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5 mb-6">
        <div className="font-bold text-[#20303C] mb-3">Новий фільтр</div>
        {availableKeys.length === 0 ? (
          <p className="text-[#8893A2] text-sm">Усі підтримувані типи фільтрів уже додані.</p>
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              <select
                value={newGroupKey}
                onChange={(e) => {
                  setNewGroupKey(e.target.value);
                  const field = FIELD_KEYS.find((f) => f.key === e.target.value);
                  setNewGroupLabel(field?.label ?? '');
                }}
                className="flex-1 border border-[#E8EDF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
              >
                <option value="">Оберіть поле для фільтрації…</option>
                {availableKeys.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
              <input
                value={newGroupLabel}
                onChange={(e) => setNewGroupLabel(e.target.value)}
                placeholder="Назва фільтра в застосунку"
                className="flex-1 border border-[#E8EDF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
              />
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !newGroupKey}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
              >
                + Створити
              </button>
            </div>
            {newGroupKey && (
              <p className="text-[#8893A2] text-xs">
                {FIELD_KEYS.find((f) => f.key === newGroupKey)?.hint}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {groups.map((group) => {
          const groupOptions = options.filter((o) => o.group_id === group.id);
          const draft = newOption[group.id] ?? { label: '', value: '' };

          return (
            <div key={group.id} className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-bold text-[#20303C] text-lg">{group.label}</div>
                  <div className="text-[#8893A2] text-xs uppercase tracking-widest font-bold">{group.key}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleGroupActive(group)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      group.is_active
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {group.is_active ? 'Активна' : 'Вимкнена'}
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                  >
                    Видалити
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {groupOptions.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-2 bg-[#F1F5FB] rounded-lg px-3 py-1.5"
                  >
                    <span className="text-sm font-semibold text-[#20303C]">{o.label}</span>
                    <span className="text-xs text-[#8893A2]">({o.value})</span>
                    <button
                      onClick={() => handleDeleteOption(o.id)}
                      className="text-red-400 hover:text-red-600 font-bold text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {groupOptions.length === 0 && (
                  <div className="text-[#8893A2] text-sm">Опцій ще немає</div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={draft.label}
                  onChange={(e) => setNewOption((prev) => ({ ...prev, [group.id]: { ...draft, label: e.target.value } }))}
                  placeholder="Назва (напр. Eureka)"
                  className="flex-1 border border-[#E8EDF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
                />
                <input
                  value={draft.value}
                  onChange={(e) => setNewOption((prev) => ({ ...prev, [group.id]: { ...draft, value: e.target.value } }))}
                  placeholder="Значення (напр. eureka)"
                  className="flex-1 border border-[#E8EDF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
                />
                <button
                  onClick={() => handleAddOption(group.id)}
                  disabled={!draft.label?.trim() || !draft.value?.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
                >
                  + Додати
                </button>
              </div>
              {FIELD_KEYS.find((f) => f.key === group.key) && (
                <p className="text-[#8893A2] text-xs mt-2">
                  {FIELD_KEYS.find((f) => f.key === group.key)?.hint}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
