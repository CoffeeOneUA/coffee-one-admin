import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import logo from '../assets/coffeeone-logo.png';

export default function LoginPage() {
  const { status, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'signed-in') {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) setError(error);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FB] p-4">
      <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Coffee One" className="h-10 w-auto mb-3" />
          <div className="text-[#8893A2] text-sm">Вхід в адмін-панель</div>
        </div>

        {status === 'unauthorized' && !error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-3.5 py-2.5 mb-4">
            У цього акаунта немає доступу до адмін-панелі. Зверніться до суперадміна.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-[#546070] mb-1.5 block">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
              placeholder="you@coffeeone.ua"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#546070] mb-1.5 block">Пароль</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#E8EDF4] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#187FD8]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
          >
            {submitting ? 'Входимо…' : 'Увійти'}
          </button>
        </form>
      </div>
    </div>
  );
}
