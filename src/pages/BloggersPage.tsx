import { useEffect, useRef, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface Blogger {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
}

const EMPTY_FORM = {
  name: '',
  nickname: '',
  photo_url: '',
  instagram_url: '',
  tiktok_url: '',
  youtube_url: '',
};

export default function BloggersPage() {
  const [bloggers, setBloggers] = useState<Blogger[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase.from('bloggers').select('*').order('name');
    setBloggers(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(b: Blogger) {
    setEditingId(b.id);
    setForm({
      name: b.name ?? '',
      nickname: b.nickname ?? '',
      photo_url: b.photo_url ?? '',
      instagram_url: b.instagram_url ?? '',
      tiktok_url: b.tiktok_url ?? '',
      youtube_url: b.youtube_url ?? '',
    });
    setModalOpen(true);
  }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `bloggers/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('products').upload(fileName, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('products').getPublicUrl(fileName);
      set('photo_url', data.publicUrl);
    } catch (e: any) {
      alert(e.message ?? 'Не вдалося завантажити фото');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      alert('Вкажіть ім’я блогера');
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      nickname: form.nickname.trim() || null,
      photo_url: form.photo_url || null,
      instagram_url: form.instagram_url.trim() || null,
      tiktok_url: form.tiktok_url.trim() || null,
      youtube_url: form.youtube_url.trim() || null,
    };

    const { error } = editingId
      ? await supabase.from('bloggers').update(payload).eq('id', editingId)
      : await supabase.from('bloggers').insert(payload);

    if (error) {
      alert(error.message);
    } else {
      setModalOpen(false);
      await fetchAll();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Видалити блогера? Це також прибере всі його рекомендації з товарів.')) return;
    const { error } = await supabase.from('bloggers').delete().eq('id', id);
    if (!error) {
      setBloggers((prev) => prev.filter((b) => b.id !== id));
    } else {
      alert(error.message);
    }
  }

  const inputClass = 'w-full border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]';

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20303C]">Блогери</h1>
          <p className="text-[#8893A2] mt-1">Довідник блогерів для рекомендацій товарів у застосунку</p>
        </div>
        <button onClick={openAdd} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8]">
          + Додати блогера
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#8893A2] font-medium">Завантаження…</div>
        </div>
      ) : bloggers.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-5xl mb-3">🎥</div>
            <div className="text-xl font-bold text-[#20303C] mb-2">Блогерів ще немає</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bloggers.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-[#E8EDF4] p-5">
              <div className="flex items-center gap-3 mb-3">
                {b.photo_url ? (
                  <img src={b.photo_url} alt={b.name} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#EAF2FC] flex items-center justify-center text-[#187FD8] font-extrabold text-lg">
                    {b.name?.[0] ?? '?'}
                  </div>
                )}
                <div>
                  <div className="font-bold text-[#20303C]">{b.name}</div>
                  {b.nickname && <div className="text-[#8893A2] text-sm">@{b.nickname}</div>}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {b.instagram_url && (
                  <span className="bg-[#F1F5FB] text-[#546070] text-xs font-semibold px-2.5 py-1 rounded-lg">Instagram</span>
                )}
                {b.tiktok_url && (
                  <span className="bg-[#F1F5FB] text-[#546070] text-xs font-semibold px-2.5 py-1 rounded-lg">TikTok</span>
                )}
                {b.youtube_url && (
                  <span className="bg-[#F1F5FB] text-[#546070] text-xs font-semibold px-2.5 py-1 rounded-lg">YouTube</span>
                )}
                {!b.instagram_url && !b.tiktok_url && !b.youtube_url && (
                  <span className="text-[#8893A2] text-xs">Соцмережі не вказано</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(b)}
                  className="flex-1 bg-[#EAF2FC] hover:bg-[#dbe9fa] text-[#187FD8] font-bold py-2.5 rounded-xl text-sm transition-all"
                >
                  Редагувати
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-bold py-2.5 rounded-xl text-sm transition-all border border-red-200"
                >
                  Видалити
                </button>
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
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold text-[#20303C] mb-5">{editingId ? 'Редагувати блогера' : 'Новий блогер'}</h2>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#EAF2FC] flex items-center justify-center text-[#187FD8] font-extrabold text-xl">
                    {form.name?.[0] ?? '?'}
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
                    disabled={uploading}
                    className="text-sm"
                  />
                  {uploading && <div className="text-xs text-[#8893A2] mt-1">Завантаження…</div>}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Ім'я</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Напр. Олексій Ковальчук" className={inputClass} />
              </div>

              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Нікнейм</label>
                <input value={form.nickname} onChange={(e) => set('nickname', e.target.value)} placeholder="Напр. coffee_alex" className={inputClass} />
              </div>

              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">Instagram (посилання)</label>
                <input value={form.instagram_url} onChange={(e) => set('instagram_url', e.target.value)} placeholder="https://instagram.com/…" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">TikTok (посилання)</label>
                <input value={form.tiktok_url} onChange={(e) => set('tiktok_url', e.target.value)} placeholder="https://tiktok.com/@…" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-bold text-[#546070] mb-1.5 block">YouTube (посилання)</label>
                <input value={form.youtube_url} onChange={(e) => set('youtube_url', e.target.value)} placeholder="https://youtube.com/@…" className={inputClass} />
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
