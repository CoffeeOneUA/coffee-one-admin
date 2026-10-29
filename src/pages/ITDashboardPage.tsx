import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Icon } from '../components/Icon';
import { usePwaPush } from '../hooks/usePwaPush';

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
  deadline: string; // datetime-local value
}

const emptyForm: TaskFormState = { title: '', description: '', deadline: '' };

function NewTaskForm({ onCreated }: { onCreated: () => void }) {
  const { admin } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!form.title.trim() || !form.deadline) {
      alert('Вкажіть назву і дедлайн');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('it_tasks').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      deadline_at: new Date(form.deadline).toISOString(),
      created_by: admin?.id ?? null,
    });
    setSaving(false);
    if (error) {
      alert(`Не вдалося створити задачу: ${error.message}`);
      return;
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

function TaskCard({ task, canEdit, onChanged }: { task: ITTask; canEdit: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [percent, setPercent] = useState(task.percent);
  const [deadline, setDeadline] = useState(toLocalInputValue(task.deadline_at));
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setPercent(task.percent);
      setDeadline(toLocalInputValue(task.deadline_at));
      setTitle(task.title);
      setDescription(task.description ?? '');
    }
  }, [task, editing]);

  async function handleSave() {
    setSaving(true);
    const completing = percent >= 100 && task.percent < 100;
    const { error } = await supabase
      .from('it_tasks')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        percent,
        deadline_at: new Date(deadline).toISOString(),
        completed_at: percent >= 100 ? (task.completed_at ?? new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id);
    setSaving(false);
    if (error) {
      alert(`Не вдалося зберегти: ${error.message}`);
      return;
    }
    if (completing) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/it-task-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({
          title: 'Задача завершена',
          body: `«${title.trim()}» виконано на 100%.`,
          url: '/it-dashboard',
        }),
      }).catch(() => {});
    }
    setEditing(false);
    onChanged();
  }

  const left = timeLeftLabel(task.deadline_at, task.percent >= 100);

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
    </div>
  );
}

export default function ITDashboardPage() {
  const { admin } = useAuth();
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
        <NewTaskForm onCreated={fetchTasks} />
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
                  <TaskCard key={t.id} task={t} canEdit={canEdit} onChanged={fetchTasks} />
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <div className="text-xs font-bold text-[#8893A2] uppercase tracking-widest mb-3">Завершені</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {completed.map((t) => (
                  <TaskCard key={t.id} task={t} canEdit={canEdit} onChanged={fetchTasks} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
