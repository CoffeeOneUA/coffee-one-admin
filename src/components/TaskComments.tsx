import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Icon } from './Icon';
import { adminLabel, type AdminLite } from '../hooks/useAdmins';
import { notifyItDashboard } from '../lib/itNotify';

interface Comment {
  id: string;
  task_id: string;
  parent_id: string | null;
  author_admin_id: string | null;
  body: string;
  created_at: string;
  liked_at: string | null;
  liked_by: string | null;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });
}

function CommentRow({
  comment,
  admins,
  isAssignee,
  isReply,
  onLiked,
  onReply,
}: {
  comment: Comment;
  admins: AdminLite[];
  isAssignee: boolean;
  isReply: boolean;
  onLiked: () => void;
  onReply: (id: string) => void;
}) {
  const [liking, setLiking] = useState(false);
  const { admin } = useAuth();
  const author = admins.find((a) => a.id === comment.author_admin_id);

  async function handleLike() {
    if (!admin) return;
    setLiking(true);
    await supabase
      .from('it_task_comments')
      .update({ liked_at: new Date().toISOString(), liked_by: admin.id })
      .eq('id', comment.id);
    setLiking(false);
    onLiked();
  }

  return (
    <div className={isReply ? 'ml-6 mt-2' : 'mt-3'}>
      <div className="bg-[#F8FAFC] rounded-xl p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-bold text-[#20303C]">{adminLabel(author)}</span>
          <span className="text-[10.5px] text-[#8893A2]">{formatDateTime(comment.created_at)}</span>
        </div>
        <p className="text-sm text-[#546070] leading-relaxed whitespace-pre-wrap">{comment.body}</p>

        <div className="flex items-center gap-3 mt-2">
          {comment.liked_at ? (
            <span className="text-xs font-semibold text-green-600 inline-flex items-center gap-1">
              <Icon name="checkCircle" size={12} /> Відповідальний погодився
            </span>
          ) : isAssignee ? (
            <button
              onClick={handleLike}
              disabled={liking}
              className="text-xs font-semibold text-[#187FD8] hover:underline disabled:opacity-50"
            >
              👍 Лайк (погодитись)
            </button>
          ) : null}

          {!isReply && isAssignee && (
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs font-semibold text-[#8893A2] hover:text-[#187FD8] hover:underline"
            >
              Відповісти
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TaskComments({
  taskId,
  assigneeId,
  admins,
}: {
  taskId: string;
  assigneeId: string | null;
  admins: AdminLite[];
}) {
  const { admin } = useAuth();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newBody, setNewBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [saving, setSaving] = useState(false);

  const isAssignee = !!admin && admin.id === assigneeId;

  async function fetchComments() {
    const { data } = await supabase
      .from('it_task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    setComments(data ?? []);
  }

  useEffect(() => {
    if (!open) return;
    fetchComments();

    const channel = supabase
      .channel(`it_task_comments_${taskId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'it_task_comments', filter: `task_id=eq.${taskId}` },
        () => fetchComments(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId]);

  async function handlePost(parentId: string | null, body: string, reset: () => void) {
    if (!body.trim() || !admin) return;
    setSaving(true);
    const { error } = await supabase.from('it_task_comments').insert({
      task_id: taskId,
      parent_id: parentId,
      author_admin_id: admin.id,
      body: body.trim(),
    });
    setSaving(false);
    if (error) {
      alert(`Не вдалося надіслати коментар: ${error.message}`);
      return;
    }
    reset();
    fetchComments();

    // Новий коментар (не відповідь) — варто сповістити відповідального,
    // якщо його коментує не він сам.
    if (!parentId && assigneeId && assigneeId !== admin.id) {
      notifyItDashboard('Новий коментар до задачі', body.trim().slice(0, 140), [assigneeId]);
    }
  }

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

  return (
    <div className="mt-3 pt-3 border-t border-[#E8EDF4]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-[#8893A2] hover:text-[#187FD8] inline-flex items-center gap-1.5"
      >
        <Icon name="mail" size={12} />
        Коментарі {comments.length > 0 ? `(${comments.length})` : ''}
        <Icon name="chevronDown" size={11} className={open ? 'rotate-180' : ''} />
      </button>

      {open && (
        <div className="mt-2">
          {topLevel.length === 0 ? (
            <div className="text-xs text-[#8893A2]">Коментарів ще немає</div>
          ) : (
            topLevel.map((c) => (
              <div key={c.id}>
                <CommentRow
                  comment={c}
                  admins={admins}
                  isAssignee={isAssignee}
                  isReply={false}
                  onLiked={fetchComments}
                  onReply={(id) => setReplyTo(id === replyTo ? null : id)}
                />
                {repliesOf(c.id).map((r) => (
                  <CommentRow
                    key={r.id}
                    comment={r}
                    admins={admins}
                    isAssignee={isAssignee}
                    isReply
                    onLiked={fetchComments}
                    onReply={() => {}}
                  />
                ))}
                {replyTo === c.id && (
                  <div className="ml-6 mt-2 flex gap-2">
                    <input
                      autoFocus
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Відповідь…"
                      className="flex-1 border border-[#E8EDF4] rounded-lg px-2.5 py-1.5 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handlePost(c.id, replyBody, () => { setReplyBody(''); setReplyTo(null); });
                        }
                      }}
                    />
                    <button
                      onClick={() => handlePost(c.id, replyBody, () => { setReplyBody(''); setReplyTo(null); })}
                      disabled={saving}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#187FD8] text-white disabled:opacity-50"
                    >
                      ОК
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          <div className="flex gap-2 mt-3">
            <input
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Залишити коментар…"
              className="flex-1 border border-[#E8EDF4] rounded-lg px-2.5 py-1.5 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePost(null, newBody, () => setNewBody(''));
              }}
            />
            <button
              onClick={() => handlePost(null, newBody, () => setNewBody(''))}
              disabled={saving}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#20303C] text-white disabled:opacity-50"
            >
              Надіслати
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
