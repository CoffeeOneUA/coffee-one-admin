import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { useAuth, type AdminRole } from '../lib/auth';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABEL: Record<AdminRole, string> = {
  superadmin: 'Суперадмін',
  admin: 'Адмін',
  moderator: 'Модератор',
};

const ROLE_COLOR: Record<AdminRole, string> = {
  superadmin: 'bg-[#187FD8]/10 text-[#187FD8]',
  admin: 'bg-[#F1F5FB] text-[#546070]',
  moderator: 'bg-amber-100 text-amber-700',
};

const inputClass = 'w-full border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => chars[n % chars.length]).join('');
}

const EMPTY_FORM = { email: '', full_name: '', role: 'admin' as AdminRole, password: generatePassword() };

export default function AdminUsersPage() {
  const { admin: me } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    setLoading(true);
    const { data } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false });
    setAdmins(data ?? []);
    setLoading(false);
  }

  const activeSuperadmins = admins.filter((a) => a.role === 'superadmin' && a.is_active).length;

  function isLastActiveSuperadmin(a: AdminUser) {
    return a.role === 'superadmin' && a.is_active && activeSuperadmins <= 1;
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, password: generatePassword() });
    setCreateError(null);
    setCreated(null);
    setShowCreate(true);
  }

  function closeCreate() {
    if (creating) return;
    setShowCreate(false);
  }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    const email = form.email.trim().toLowerCase();
    if (!email || form.password.length < 8) {
      setCreateError('Вкажіть email і пароль (мінімум 8 символів)');
      return;
    }
    setCreating(true);
    setCreateError(null);

    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password: form.password,
      email_confirm: true,
      user_metadata: form.full_name.trim() ? { full_name: form.full_name.trim() } : undefined,
    });

    if (createUserError || !newUser.user) {
      setCreating(false);
      setCreateError(createUserError?.message ?? 'Не вдалося створити користувача');
      return;
    }

    const { error: insertError } = await supabase.from('admin_users').insert({
      id: newUser.user.id,
      email,
      full_name: form.full_name.trim() || null,
      role: form.role,
      is_active: true,
      invited_by: me?.id ?? null,
    });

    setCreating(false);

    if (insertError) {
      setCreateError(`Акаунт створено, але не вдалось надати доступ: ${insertError.message}`);
      return;
    }

    setCreated({ email, password: form.password });
    fetchAdmins();
  }

  async function copyPassword() {
    if (!created) return;
    await navigator.clipboard.writeText(created.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function changeRole(a: AdminUser, role: AdminRole) {
    if (a.role === role) return;
    if (isLastActiveSuperadmin(a)) {
      alert('Не можна змінити роль єдиного активного суперадміна.');
      return;
    }
    setActionId(a.id);
    const { error } = await supabase.from('admin_users').update({ role }).eq('id', a.id);
    if (!error) setAdmins((prev) => prev.map((x) => (x.id === a.id ? { ...x, role } : x)));
    else alert(error.message);
    setActionId(null);
  }

  async function toggleActive(a: AdminUser) {
    if (a.id === me?.id) {
      alert('Не можна відкликати доступ самому собі.');
      return;
    }
    if (a.is_active && isLastActiveSuperadmin(a)) {
      alert('Не можна відкликати доступ єдиного активного суперадміна.');
      return;
    }
    setActionId(a.id);
    const next = !a.is_active;
    const { error } = await supabase.from('admin_users').update({ is_active: next }).eq('id', a.id);
    if (!error) setAdmins((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_active: next } : x)));
    else alert(error.message);
    setActionId(null);
  }

  async function deleteAdmin(a: AdminUser) {
    if (a.id === me?.id) {
      alert('Не можна видалити самого себе.');
      return;
    }
    if (isLastActiveSuperadmin(a)) {
      alert('Не можна видалити єдиного активного суперадміна.');
      return;
    }
    if (!confirm(`Остаточно видалити доступ для ${a.email}? Акаунт більше не зможе увійти.`)) return;
    setActionId(a.id);
    const { error } = await supabase.auth.admin.deleteUser(a.id);
    if (error) {
      alert(error.message);
      setActionId(null);
      return;
    }
    setAdmins((prev) => prev.filter((x) => x.id !== a.id));
    setActionId(null);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20303C]">Доступи</h1>
          <p className="text-[#8893A2] mt-1">
            Хто може заходити в цю адмін-панель і з якою роллю. Суперадмін бачить і може все, інші ролі — усе, крім цієї сторінки.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="font-bold px-5 py-2.5 rounded-xl text-sm bg-[#187FD8] text-white hover:bg-[#1169B8] transition-all shrink-0"
        >
          + Додати адміна
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#8893A2] font-medium">Завантаження…</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden">
          {admins.map((a, i) => (
            <div key={a.id} className={`p-5 flex items-center justify-between gap-4 ${i !== admins.length - 1 ? 'border-b border-[#E8EDF4]' : ''}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[#20303C]">{a.full_name || a.email}</span>
                  {a.id === me?.id && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F1F5FB] text-[#8893A2]">Це ви</span>
                  )}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_COLOR[a.role]}`}>{ROLE_LABEL[a.role]}</span>
                  {!a.is_active && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Доступ відкликано</span>
                  )}
                </div>
                <div className="text-[#546070] text-sm">{a.email}</div>
                <div className="text-[#8893A2] text-xs mt-1">Додано {formatDate(a.created_at)}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={a.role}
                  onChange={(e) => changeRole(a, e.target.value as AdminRole)}
                  disabled={actionId === a.id}
                  className="border border-[#E8EDF4] rounded-xl text-sm font-semibold px-3 py-2.5 text-[#546070] focus:outline-none focus:ring-2 focus:ring-[#187FD8] disabled:opacity-50"
                >
                  <option value="superadmin">Суперадмін</option>
                  <option value="admin">Адмін</option>
                  <option value="moderator">Модератор</option>
                </select>
                <button
                  onClick={() => toggleActive(a)}
                  disabled={actionId === a.id}
                  className={`font-bold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 ${
                    a.is_active
                      ? 'bg-red-50 hover:bg-red-100 text-red-500 border border-red-200'
                      : 'bg-[#EAF2FC] hover:bg-[#dbe9fa] text-[#187FD8]'
                  }`}
                >
                  {actionId === a.id ? '…' : a.is_active ? 'Відкликати' : 'Відновити'}
                </button>
                <button
                  onClick={() => deleteAdmin(a)}
                  disabled={actionId === a.id}
                  className="font-bold px-3 py-2.5 rounded-xl text-sm bg-[#F1F5FB] hover:bg-red-50 hover:text-red-500 text-[#8893A2] transition-all disabled:opacity-50"
                  title="Видалити назавжди"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeCreate}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            {created ? (
              <>
                <div className="text-4xl mb-3">✅</div>
                <h2 className="text-xl font-extrabold text-[#20303C] mb-1">Доступ надано</h2>
                <p className="text-[#8893A2] text-sm mb-4">
                  Передайте ці дані новому адміну — пароль ніде більше не показується.
                </p>
                <div className="bg-[#F8FAFC] rounded-xl p-4 flex flex-col gap-2 mb-5">
                  <div className="text-sm"><span className="text-[#8893A2]">Email: </span><span className="font-bold text-[#20303C]">{created.email}</span></div>
                  <div className="text-sm flex items-center gap-2">
                    <span className="text-[#8893A2]">Пароль: </span>
                    <span className="font-mono font-bold text-[#20303C]">{created.password}</span>
                    <button onClick={copyPassword} className="text-xs font-bold text-[#187FD8] hover:underline">
                      {copied ? 'Скопійовано ✓' : 'Копіювати'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8]"
                >
                  Готово
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-extrabold text-[#20303C] mb-1">Новий адмін</h2>
                <p className="text-[#8893A2] text-xs mb-5">Створює акаунт для входу в цю панель і одразу надає доступ.</p>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#546070] mb-1.5 block">Email</label>
                    <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} placeholder="name@coffeeone.ua" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#546070] mb-1.5 block">Ім'я</label>
                    <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#546070] mb-1.5 block">Роль</label>
                    <select value={form.role} onChange={(e) => set('role', e.target.value as AdminRole)} className={inputClass}>
                      <option value="admin">Адмін</option>
                      <option value="moderator">Модератор</option>
                      <option value="superadmin">Суперадмін</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#546070] mb-1.5 block">Тимчасовий пароль</label>
                    <div className="flex items-center gap-2">
                      <input value={form.password} onChange={(e) => set('password', e.target.value)} className={`${inputClass} font-mono`} />
                      <button
                        type="button"
                        onClick={() => set('password', generatePassword())}
                        className="shrink-0 px-3 py-2.5 rounded-lg text-sm font-bold bg-[#F1F5FB] text-[#546070] hover:bg-[#e4ebf5]"
                        title="Згенерувати новий"
                      >
                        🔄
                      </button>
                    </div>
                    <p className="text-[#8893A2] text-xs mt-1.5">Передасте вручну — після створення пароль повторно показати не можна.</p>
                  </div>
                </div>

                {createError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-3.5 py-2.5 mt-4">
                    {createError}
                  </div>
                )}

                <div className="flex gap-3 mt-5">
                  <button onClick={closeCreate} disabled={creating} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#F1F5FB] text-[#546070] hover:bg-[#e4ebf5]">
                    Скасувати
                  </button>
                  <button onClick={handleCreate} disabled={creating} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50">
                    {creating ? 'Створюємо…' : 'Створити'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
