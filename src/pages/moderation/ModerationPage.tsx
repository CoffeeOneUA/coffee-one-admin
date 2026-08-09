import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../../lib/supabase';

interface Listing {
  id: string;
  title: string;
  price_usd: number;
  price_uah: number;
  city: string;
  condition: string;
  groups: number | null;
  year: number | null;
  description: string;
  photos: string[];
  status: string;
  is_top: boolean;
  created_at: string;
  brands: { name: string } | null;
  categories: { name: string } | null;
  profiles: { full_name: string; phone: string } | null;
}

type FilterStatus = 'pending' | 'approved' | 'rejected';

export default function ModerationPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, [filter]);

  async function fetchListings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .select('*, brands(name), categories(name), profiles(full_name, phone)')
      .eq('status', filter)
      .order('created_at', { ascending: false });

    if (!error) setListings(data ?? []);
    setLoading(false);
  }

  async function handleApprove(id: string) {
    setActionLoading(id + '_approve');
    const { error } = await supabase
      .from('listings')
      .update({ status: 'approved', is_verified: true })
      .eq('id', id);

    if (!error) {
      setListings(prev => prev.filter(l => l.id !== id));
    }
    setActionLoading(null);
  }

  async function handleReject(id: string) {
    setActionLoading(id + '_reject');
    const { error } = await supabase
      .from('listings')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (!error) {
      setListings(prev => prev.filter(l => l.id !== id));
    }
    setActionLoading(null);
  }

  async function handleTop(id: string, currentTop: boolean) {
    await supabase
      .from('listings')
      .update({ is_top: !currentTop })
      .eq('id', id);

    setListings(prev =>
      prev.map(l => l.id === id ? { ...l, is_top: !currentTop } : l)
    );
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const tabs: { key: FilterStatus; label: string; color: string }[] = [
    { key: 'pending', label: 'На модерації', color: 'bg-amber-100 text-amber-700' },
    { key: 'approved', label: 'Схвалені', color: 'bg-green-100 text-green-700' },
    { key: 'rejected', label: 'Відхилені', color: 'bg-red-100 text-red-700' },
  ];

  return (
    <div className="p-8">
      {/* Заголовок */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Модерація оголошень</h1>
        <p className="text-[#8893A2] mt-1">Перевіряйте та схвалюйте оголошення маркетплейсу</p>
      </div>

      {/* Таби */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              filter === tab.key
                ? 'bg-[#20303C] text-white shadow-lg'
                : 'bg-white text-[#8893A2] hover:bg-gray-50 border border-[#E8EDF4]'
            }`}
          >
            {tab.label}
            {filter === tab.key && listings.length > 0 && (
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {listings.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Контент */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-3">⏳</div>
            <div className="text-[#8893A2] font-medium">Завантаження…</div>
          </div>
        </div>
      ) : listings.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-5xl mb-3">
              {filter === 'pending' ? '✅' : filter === 'approved' ? '📋' : '🗑'}
            </div>
            <div className="text-xl font-bold text-[#20303C] mb-2">
              {filter === 'pending' ? 'Немає нових оголошень' : 'Список порожній'}
            </div>
            <div className="text-[#8893A2]">
              {filter === 'pending'
                ? 'Усі оголошення перевірено 🎉'
                : 'Оголошень в цій категорії немає'}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white rounded-2xl shadow-sm border border-[#E8EDF4] overflow-hidden"
            >
              {/* Фото */}
              <div className="h-48 bg-gradient-to-br from-[#dfe9f6] to-[#c3d4ea] relative flex items-center justify-center">
                {listing.photos && listing.photos.length > 0 ? (
                  <img
                    src={listing.photos[0]}
                    alt={listing.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-6xl">☕</span>
                )}
                {/* Кількість фото */}
                {listing.photos && listing.photos.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-lg">
                    📷 {listing.photos.length}
                  </div>
                )}
                {/* Дата */}
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-lg">
                  {formatDate(listing.created_at)}
                </div>
              </div>

              {/* Тіло */}
              <div className="p-4">
                {/* Назва і ціна */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <div className="font-bold text-[#20303C] text-base leading-tight">
                      {listing.title}
                    </div>
                    <div className="text-[#8893A2] text-sm mt-1">
                      {listing.brands?.name} · {listing.categories?.name}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-extrabold text-[#20303C] text-lg">
                      ${Number(listing.price_usd).toLocaleString()}
                    </div>
                    <div className="text-[#8893A2] text-xs">
                      ≈ {Number(listing.price_uah).toLocaleString()} ₴
                    </div>
                  </div>
                </div>

                {/* Характеристики */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="bg-[#F1F5FB] text-[#546070] text-xs font-semibold px-2.5 py-1 rounded-lg">
                    📍 {listing.city}
                  </span>
                  <span className="bg-[#F1F5FB] text-[#546070] text-xs font-semibold px-2.5 py-1 rounded-lg">
                    {listing.condition === 'new' ? '✨ Нова' : '🔄 Б/в'}
                  </span>
                  {listing.groups && (
                    <span className="bg-[#F1F5FB] text-[#546070] text-xs font-semibold px-2.5 py-1 rounded-lg">
                      {listing.groups} групи
                    </span>
                  )}
                  {listing.year && (
                    <span className="bg-[#F1F5FB] text-[#546070] text-xs font-semibold px-2.5 py-1 rounded-lg">
                      {listing.year}
                    </span>
                  )}
                </div>

                {/* Опис */}
                {listing.description && (
                  <p className="text-[#8893A2] text-sm mb-3 line-clamp-2 leading-relaxed">
                    {listing.description}
                  </p>
                )}

                {/* Продавець */}
                <div className="flex items-center gap-2 py-3 border-t border-[#E8EDF4] mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#187FD8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {listing.profiles?.full_name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#20303C] text-sm truncate">
                      {listing.profiles?.full_name ?? 'Невідомий'}
                    </div>
                    <div className="text-[#8893A2] text-xs">
                      {listing.profiles?.phone ?? '—'}
                    </div>
                  </div>
                </div>

                {/* Кнопки дій */}
                {filter === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(listing.id)}
                      disabled={!!actionLoading}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
                    >
                      {actionLoading === listing.id + '_approve' ? '⏳' : '✓ Схвалити'}
                    </button>
                    <button
                      onClick={() => handleReject(listing.id)}
                      disabled={!!actionLoading}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-bold py-2.5 rounded-xl text-sm transition-all border border-red-200 disabled:opacity-50"
                    >
                      {actionLoading === listing.id + '_reject' ? '⏳' : '✕ Відхилити'}
                    </button>
                  </div>
                )}

                {filter === 'approved' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTop(listing.id, listing.is_top)}
                      className={`flex-1 font-bold py-2.5 rounded-xl text-sm transition-all border ${
                        listing.is_top
                          ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                          : 'bg-[#F1F5FB] text-[#546070] border-[#E8EDF4] hover:bg-[#e4ebf5]'
                      }`}
                    >
                      {listing.is_top ? '📌 У топі' : '📌 В топ'}
                    </button>
                    <button
                      onClick={() => handleReject(listing.id)}
                      disabled={!!actionLoading}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-bold py-2.5 rounded-xl text-sm transition-all border border-red-200 disabled:opacity-50"
                    >
                      Зняти з публікації
                    </button>
                  </div>
                )}

                {filter === 'rejected' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(listing.id)}
                      disabled={!!actionLoading}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
                    >
                      ✓ Схвалити
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}