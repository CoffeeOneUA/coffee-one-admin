import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface OrderItem {
  id: string;
  title: string;
  price_usd: number;
  quantity: number;
}

interface Order {
  id: string;
  status: 'pending_payment' | 'processing' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  payment_method: 'requisites' | 'wayforpay';
  total_usd: number;
  total_uah: number;
  delivery_city: string | null;
  delivery_address: string | null;
  contact_phone: string;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  order_items: OrderItem[];
  profiles: { full_name: string | null; phone: string | null } | null;
}

const STATUS_LABEL: Record<Order['status'], string> = {
  pending_payment: 'Очікує оплати',
  processing: 'В обробці',
  paid: 'Оплачено',
  shipped: 'Відправлено',
  completed: 'Виконано',
  cancelled: 'Скасовано',
};

const STATUS_COLOR: Record<Order['status'], string> = {
  pending_payment: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  shipped: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_FLOW: Order['status'][] = ['pending_payment', 'processing', 'paid', 'shipped', 'completed'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [noteSaving, setNoteSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), profiles(full_name, phone)')
      .order('created_at', { ascending: false });

    if (!error) {
      setOrders(data ?? []);
      const drafts: Record<string, string> = {};
      for (const o of data ?? []) drafts[o.id] = o.admin_notes ?? '';
      setNoteDrafts(drafts);
    }
    setLoading(false);
  }

  async function setStatus(id: string, status: Order['status']) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    }
  }

  async function saveNote(id: string) {
    setNoteSaving(id);
    const text = noteDrafts[id]?.trim() || null;
    const { error } = await supabase.from('orders').update({ admin_notes: text }).eq('id', id);
    setNoteSaving(null);
    if (error) {
      alert(error.message);
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, admin_notes: text } : o)));
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  const filtered = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);
  const tabs: { key: Order['status'] | 'all'; label: string }[] = [
    { key: 'all', label: 'Усі' },
    { key: 'pending_payment', label: 'Очікують оплати' },
    { key: 'processing', label: 'В обробці' },
    { key: 'paid', label: 'Оплачені' },
    { key: 'shipped', label: 'Відправлені' },
    { key: 'completed', label: 'Виконані' },
    { key: 'cancelled', label: 'Скасовані' },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Замовлення</h1>
        <p className="text-[#8893A2] mt-1">Оплата за реквізитами — після оформлення звʼяжись і надай реквізити</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              statusFilter === tab.key
                ? 'bg-[#20303C] text-white shadow-lg'
                : 'bg-white text-[#8893A2] hover:bg-gray-50 border border-[#E8EDF4]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[#8893A2]">Завантаження…</div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-5xl mb-3">📦</div>
            <div className="text-xl font-bold text-[#20303C]">Замовлень немає</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                    <span className="text-xs text-[#8893A2] uppercase tracking-widest font-bold">
                      {order.payment_method === 'requisites' ? 'За реквізитами' : 'WayForPay'}
                    </span>
                  </div>
                  <div className="font-bold text-[#20303C]">{order.profiles?.full_name ?? 'Клієнт'}</div>
                  <a href={`tel:${order.contact_phone}`} className="text-[#187FD8] text-sm font-semibold">
                    {order.contact_phone}
                  </a>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-[#20303C] text-lg">${Number(order.total_usd).toLocaleString()}</div>
                  <div className="text-[#8893A2] text-xs">≈ {Number(order.total_uah).toLocaleString()} ₴</div>
                  <div className="text-[#8893A2] text-xs mt-1">{formatDate(order.created_at)}</div>
                </div>
              </div>

              <div className="bg-[#F1F5FB] rounded-xl p-3 mb-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-0.5">
                    <span className="text-[#20303C]">{item.quantity} × {item.title}</span>
                    <span className="font-semibold text-[#20303C]">${(item.price_usd * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {(order.delivery_city || order.delivery_address) && (
                <div className="text-[#546070] text-sm mb-2">
                  📍 {order.delivery_city}{order.delivery_address ? `, ${order.delivery_address}` : ''}
                </div>
              )}
              {order.notes && (
                <div className="text-[#546070] text-sm mb-3 italic">"{order.notes}"</div>
              )}

              <div className="mb-3">
                <label className="text-[10px] font-bold text-[#8893A2] uppercase tracking-wide mb-1 block">Примітка менеджера</label>
                <textarea
                  value={noteDrafts[order.id] ?? ''}
                  onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [order.id]: e.target.value }))}
                  rows={2}
                  placeholder="Внутрішня примітка — клієнт її не бачить"
                  className="w-full border border-[#E8EDF4] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#187FD8] resize-none"
                />
                {(noteDrafts[order.id] ?? '') !== (order.admin_notes ?? '') && (
                  <button
                    onClick={() => saveNote(order.id)}
                    disabled={noteSaving === order.id}
                    className="mt-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
                  >
                    {noteSaving === order.id ? 'Зберігаємо…' : 'Зберегти примітку'}
                  </button>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(order.id, s)}
                    disabled={order.status === s}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                      order.status === s
                        ? 'bg-[#20303C] text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
                {order.status !== 'cancelled' && (
                  <button
                    onClick={() => setStatus(order.id, 'cancelled')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                  >
                    Скасувати
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
