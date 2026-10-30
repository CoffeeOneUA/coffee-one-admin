import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Icon } from '../components/Icon';
import { usePwaPush } from '../hooks/usePwaPush';
import { useAdmins, adminLabel, type AdminLite } from '../hooks/useAdmins';
import { notifyItDashboard, YURII_EMAIL } from '../lib/itNotify';
import { TaskComments } from '../components/TaskComments';

type Currency = 'UAH' | 'USD';
const CURRENCY_SIGN: Record<Currency, string> = { UAH: '₴', USD: '$' };

interface ITTask {
  id: string;
  title: string;
  description: string | null;
  percent: number;
  started_at: string;
  deadline_at: string;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  assignee_admin_id: string | null;
  budget_amount: number | null;
  budget_currency: Currency | null;
  budget_approved_at: string | null;
  budget_approved_by: string | null;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function timeLeftLabel(deadlineIso: string, completed: boolean): { text: string; tone: 'ok' | 'warn' | 'over' } {
  if (completed) return { text: 'Завершено', tone: 'ok' };
  const diffMs = new Date(deadlineIso).getTime() - Date.now();
  if (diffMs < 0) {
    const h = Math.round(-diffMs / 3600000);
    return { text: h < 24 ? `Прострочено на ${h} год` : `Прострочено на ${Math.round(h / 24)} дн`, tone: 'over' };
  }
  const h = Math.round(diffMs / 3600000);
  if (h < 1) return { text: 'Менше години лишилось', tone: 'warn' };
  if (h < 24) return { text: `Лишилось ${h} год`, tone: 'warn' };
  return { text: `Лишилось ${Math.round(h / 24)} дн`, tone: 'ok' };
}

const TONE_COLOR: Record<'ok' | 'warn' | 'over', string> = {
  ok: 'text-[#8893A2]',
  warn: 'text-amber-600',
  over: 'text-red-600',
};

function ProgressBar({ percent }: { percent: number }) {
  const color = percent >= 100 ? 'bg-green-500' : percent >= 60 ? 'bg-[#187FD8]' : percent >= 25 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="w-full h-2.5 rounded-full bg-[#EEF2F7] overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function BudgetBadge({ task }: { task: ITTask }) {
  if (task.budget_amount == null || !task.budget_currency) return null;
  const approved = !!task.budget_approved_at;
  return (
    <span
      className={`text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
        approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
      title={approved ? `Погоджено Юрієм ${formatDateTime(task.budget_approved_at!)}` : 'Очікує погодження Юрієм'}
    >
      <Icon name="wallet" size={11} />
      {task.budget_amount.toLocaleString('uk-UA')} {CURRENCY_SIGN[task.budget_currency]}
      {!approved && ' · не погоджено'}
    </span>
  );
}

function PushToggle() {
  const { supported, permission, subscribed, busy, subscribe, unsubscribe } = usePwaPush();

  if (!supported) {
    return <span className="text-xs text-[#8893A2]">Push недоступний у цьому браузері</span>;
  }

  if (subscribed) {
    return (
      <button
        onClick={unsubscribe}
        disabled={busy}
        className="text-xs font-bold px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200 inline-flex items-center gap-1.5 disabled:opacity-50"
      >
        <Icon name="bell" size={13} /> Сповіщення увімкнено
      </button>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={busy || permission === 'denied'}
      className="text-xs font-bold px-3 py-2 rounded-lg bg-[#187FD8] text-white inline-flex items-center gap-1.5 disabled:opacity-50"
      title={permission === 'denied' ? 'Сповіщення заблоковано в налаштуваннях браузера' : undefined}
    >
      <Icon name="bell" size={13} /> {permission === 'denied' ? 'Сповіщення заблоковано' : 'Увімкнути push на цьому пристрої'}
    </button>
  );
}

interface TaskFormState {
  title: string;
  description: string;
  deadline: string;
  assigneeId: string;
  budgetAmount: string;
  budgetCurrency: Currency;
  hasBudget: boolean;
}

const emptyForm: TaskFormState = {
  title: '', description: '', deadline: '', assigneeId: '',
  budgetAmount: '', budgetCurrency: 'UAH', hasBudget: false,
};

function NewTaskForm({ admins, onCreated }: { admins: AdminLite[]; onCreated: () => void }) {
  const { admin } = useAuth();
  const isSuperadmin = admin?.role === 'superadmin';
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!form.title.trim() || !form.deadline) {
      alert('Вкажіть назву і дедлайн');
      return;
    }
    setSaving(true);

    const budgetAmount = form.hasBudget && form.budgetAmount ? Number(form.budgetAmount) : null;
    const { data: inserted, error } = await supabase
      .from('it_tasks')
      .insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        deadline_at: new Date(form.deadline).toISOString(),
        created_by: admin?.id ?? null,
        assignee_admin_id: isSuperadmin && form.assigneeId ? form.assigneeId : null,
        budget_amount: budgetAmount,
        budget_currency: budgetAmount != null ? form.budgetCurrency : null,
      })
      .select()
      .single();

    setSaving(false);
    if (error || !inserted) {
      alert(`Не вдалося створити задачу: ${error?.message}`);
      return;
    }

    const superadminIds = admins.filter((a) => a.role === 'superadmin').map((a) => a.id);
    if (superadminIds.length > 0) {
      notifyItDashboard('Нова IT-задача', form.title.trim(), superadminIds);
    }
    if (isSuperadmin && form.assigneeId) {
      notifyItDashboard('Вам призначено задачу', form.title.trim(), [form.assigneeId]);
    }
    if (budgetAmount != null) {
      const yurii = admins.find((a) => a.email === YURII_EMAIL);
      if (yurii) {
        notifyItDashboard(
          'Потрібне погодження кошторису',
          `«${form.title.trim()}» — ${budgetAmount.toLocaleString('uk-UA')} ${CURRENCY_SIGN[form.budgetCurrency]}`,
          [yurii.id],
        );
      }
    }

    setForm(emptyForm);
    setOpen(false);
    onCreated();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2.5 rounded-xl text-sm font-bold bg-[#20303C] text-white hover:bg-[#182530]"
      >
        + Нова задача
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5 mb-6 flex flex-col gap-3 max-w-xl">
      <div className="font-bold text-[#20303C]">Нова задача</div>
      <input
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        placeholder="Назва задачі"
        className="border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
      />
      <textarea
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        placeholder="Опис (необов'язково)"
        rows={3}
        className="border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8] resize-none"
      />
      <div>
        <label className="text-xs font-semibold text-[#8893A2] block mb-1">Дедлайн (дата й час)</label>
        <input
          type="datetime-local"
          value={form.deadline}
          onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          className="border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
        />
      </div>

      {isSuperadmin && (
        <div>
          <label className="text-xs font-semibold text-[#8893A2] block mb-1">Відповідальний</label>
          <select
            value={form.assigneeId}
            onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
            className="border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
          >
            <option value="">Не визначено</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>{adminLabel(a)}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-[#8893A2] flex items-center gap-2 mb-1">
          <input
            type="checkbox"
            checked={form.hasBudget}
            onChange={(e) => setForm((f) => ({ ...f, hasBudget: e.target.checked }))}
          />
          Кошторис
        </label>
        {form.hasBudget && (
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={form.budgetAmount}
              onChange={(e) => setForm((f) => ({ ...f, budgetAmount: e.target.value }))}
              placeholder="Сума"
              className="border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
            />
            <select
              value={form.budgetCurrency}
              onChange={(e) => setForm((f) => ({ ...f, budgetCurrency: e.target.value as Currency }))}
              className="border border-[#E8EDF4] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
            >
              <option value="UAH">₴ UAH</option>
              <option value="USD">$ USD</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-1">
        <button
          onClick={handleCreate}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
        >
          {saving ? 'Створення…' : 'Створити'}
        </button>
        <button
          onClick={() => { setOpen(false); setForm(emptyForm); }}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-[#F1F5FB] text-[#546070]"
        >
          Скасувати
        </button>
      </div>
    </div>
  );
}

function TaskCard({ task, canEdit, admins, onChanged }: { task: ITTask; canEdit: boolean; admins: AdminLite[]; onChanged: () => void }) {
  const { admin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [percent, setPercent] = useState(task.percent);
  const [deadline, setDeadline] = useState(toLocalInputValue(task.deadline_at));
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [assigneeId, setAssigneeId] = useState(task.assignee_admin_id ?? '');
  const [hasBudget, setHasBudget] = useState(task.budget_amount != null);
  const [budgetAmount, setBudgetAmount] = useState(task.budget_amount != null ? String(task.budget_amount) : '');
  const [budgetCurrency, setBudgetCurrency] = useState<Currency>(task.budget_currency ?? 'UAH');
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  const isYurii = admin?.email === YURII_EMAIL;

  useEffect(() => {
    if (!editing) {
      setPercent(task.percent);
      setDeadline(toLocalInputValue(task.deadline_at));
      setTitle(task.title);
      setDescription(task.description ?? '');
      setAssigneeId(task.assignee_admin_id ?? '');
      setHasBudget(task.budget_amount != null);
      setBudgetAmount(task.budget_amount != null ? String(task.budget_amount) : '');
      setBudgetCurrency(task.budget_currency ?? 'UAH');
    }
  }, [task, editing]);

  async function handleSave() {
    setSaving(true);
    const completing = percent >= 100 && task.percent < 100;
    const newAssigneeId = assigneeId || null;
    const assigneeChanged = newAssigneeId && newAssigneeId !== task.assignee_admin_id;
    const newBudgetAmount = hasBudget && budgetAmount ? Number(budgetAmount) : null;
    const budgetChanged = newBudgetAmount !== task.budget_amount || (newBudgetAmount != null && budgetCurrency !== task.budget_currency);

    const { error } = await supabase
      .from('it_tasks')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        percent,
        deadline_at: new Date(deadline).toISOString(),
        completed_at: percent >= 100 ? (task.completed_at ?? new Date().toISOString()) : null,
        assignee_admin_id: newAssigneeId,
        budget_amount: newBudgetAmount,
        budget_currency: newBudgetAmount != null ? budgetCurrency : null,
        // Будь-яка зміна кошторису вимагає погодження заново.
        ...(budgetChanged ? { budget_approved_at: null, budget_approved_by: null } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id);
    setSaving(false);
    if (error) {
      alert(`Не вдалося зберегти: ${error.message}`);
      return;
    }

    if (completing) {
      notifyItDashboard('Задача завершена', `«${title.trim()}» виконано на 100%.`, null);
    }
    if (assigneeChanged) {
      notifyItDashboard('Вам призначено задачу', title.trim(), [newAssigneeId!]);
    }
    if (budgetChanged && newBudgetAmount != null) {
      const yurii = admins.find((a) => a.email === YURII_EMAIL);
      if (yurii) {
        notifyItDashboard(
          'Потрібне погодження кошторису',
          `«${title.trim()}» — ${newBudgetAmount.toLocaleString('uk-UA')} ${CURRENCY_SIGN[budgetCurrency]}`,
          [yurii.id],
        );
      }
    }

    setEditing(false);
    onChanged();
  }

  async function handleApproveBudget() {
    if (!admin) return;
    setApproving(true);
    const { error } = await supabase
      .from('it_tasks')
      .update({ budget_approved_at: new Date().toISOString(), budget_approved_by: admin.id })
      .eq('id', task.id);
    setApproving(false);
    if (error) alert(`Не вдалося погодити: ${error.message}`);
    else onChanged();
  }

  const left = timeLeftLabel(task.deadline_at, task.percent >= 100);
  const assignee = admins.find((a) => a.id === task.assignee_admin_id);

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-bold text-[#20303C] text-base w-full border border-[#E8EDF4] rounded-lg px-2.5 py-1.5"
            />
          ) : (
            <div className="font-bold text-[#20303C] text-base">{task.title}</div>
          )}
        </div>
        <span className="text-lg font-extrabold text-[#20303C] flex-shrink-0">{task.percent}%</span>
      </div>

      {editing ? (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full border border-[#E8EDF4] rounded-lg px-2.5 py-1.5 text-sm text-[#546070] mb-3 resize-none"
        />
      ) : task.description ? (
        <p className="text-[#546070] text-sm mb-3 leading-relaxed">{task.description}</p>
      ) : null}

      <div className="flex items-center flex-wrap gap-1.5 mb-3">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${assignee ? 'bg-[#F1F5FB] text-[#546070]' : 'bg-amber-100 text-amber-700'}`}>
          {assignee ? `Відповідальний: ${adminLabel(assignee)}` : 'Відповідальний: Не визначено'}
        </span>
        <BudgetBadge task={task} />
      </div>

      <ProgressBar percent={task.percent} />

      <div className="flex items-center justify-between mt-3 text-xs text-[#8893A2]">
        <span>Розпочато: {formatDateTime(task.started_at)}</span>
        <span className={`font-semibold ${TONE_COLOR[left.tone]}`}>{left.text}</span>
      </div>
      <div className="text-xs text-[#8893A2] mt-1">
        Дедлайн: {editing ? (
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="border border-[#E8EDF4] rounded-lg px-2 py-1 text-xs ml-1"
          />
        ) : formatDateTime(task.deadline_at)}
      </div>

      {isYurii && task.budget_amount != null && !task.budget_approved_at && (
        <button
          onClick={handleApproveBudget}
          disabled={approving}
          className="mt-3 w-full text-xs font-bold px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {approving ? 'Погодження…' : `Погодити кошторис ${task.budget_amount.toLocaleString('uk-UA')} ${CURRENCY_SIGN[task.budget_currency!]}`}
        </button>
      )}

      {canEdit && (
        <div className="mt-4 pt-3 border-t border-[#E8EDF4]">
          {editing ? (
            <>
              <label className="text-xs font-semibold text-[#8893A2] block mb-1.5">Прогрес: {percent}%</label>
              <input
                type="range"
                min={0}
                max={100}
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="w-full accent-[#187FD8]"
              />

              <label className="text-xs font-semibold text-[#8893A2] block mb-1 mt-3">Відповідальний</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="border border-[#E8EDF4] rounded-lg px-3 py-2 text-xs w-full"
              >
                <option value="">Не визначено</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>{adminLabel(a)}</option>
                ))}
              </select>

              <label className="text-xs font-semibold text-[#8893A2] flex items-center gap-2 mt-3 mb-1">
                <input type="checkbox" checked={hasBudget} onChange={(e) => setHasBudget(e.target.checked)} />
                Кошторис
              </label>
              {hasBudget && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    placeholder="Сума"
                    className="border border-[#E8EDF4] rounded-lg px-3 py-2 text-xs flex-1"
                  />
                  <select
                    value={budgetCurrency}
                    onChange={(e) => setBudgetCurrency(e.target.value as Currency)}
                    className="border border-[#E8EDF4] rounded-lg px-2 py-2 text-xs"
                  >
                    <option value="UAH">₴ UAH</option>
                    <option value="USD">$ USD</option>
                  </select>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
                >
                  {saving ? 'Збереження…' : 'Зберегти'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#F1F5FB] text-[#546070]"
                >
                  Скасувати
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-[#187FD8] hover:underline inline-flex items-center gap-1"
            >
              <Icon name="edit" size={12} /> Редагувати / змінити прогрес
            </button>
          )}
        </div>
      )}

      <TaskComments taskId={task.id} assigneeId={task.assignee_admin_id} admins={admins} />
    </div>
  );
}

export default function ITDashboardPage() {
  const { admin } = useAuth();
  const { admins } = useAdmins();
  const [tasks, setTasks] = useState<ITTask[]>([]);
  const [loading, setLoading] = useState(true);
  const canEdit = admin?.role === 'superadmin';

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('it_tasks')
      .select('*')
      .order('deadline_at', { ascending: true });
    if (!error) setTasks(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTasks();

    // Realtime: будь-яка зміна it_tasks (своя чи з іншої вкладки/пристрою)
    // одразу перемальовує список — без перезавантаження сторінки.
    const channel = supabase
      .channel('it_tasks_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'it_tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = tasks.filter((t) => t.percent < 100);
  const completed = tasks.filter((t) => t.percent >= 100);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20303C]">IT Дашборд</h1>
          <p className="text-[#8893A2] mt-1">Прогрес задач розробки в реальному часі — не стосується мобільного застосунку</p>
        </div>
        <PushToggle />
      </div>

      <div className="mb-6">
        <NewTaskForm admins={admins} onCreated={fetchTasks} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#8893A2] font-medium">Завантаження…</div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="flex justify-center mb-3"><Icon name="clipboard" size={40} color="#C2CDDA" /></div>
            <div className="text-xl font-bold text-[#20303C] mb-2">Задач ще немає</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {active.length > 0 && (
            <div>
              <div className="text-xs font-bold text-[#8893A2] uppercase tracking-widest mb-3">У роботі</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {active.map((t) => (
                  <TaskCard key={t.id} task={t} canEdit={canEdit} admins={admins} onChanged={fetchTasks} />
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <div className="text-xs font-bold text-[#8893A2] uppercase tracking-widest mb-3">Завершені</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {completed.map((t) => (
                  <TaskCard key={t.id} task={t} canEdit={canEdit} admins={admins} onChanged={fetchTasks} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
