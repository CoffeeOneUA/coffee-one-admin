import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AdminRole = 'superadmin' | 'admin' | 'moderator';

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  is_active: boolean;
}

type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'unauthorized';

interface AuthContextValue {
  status: AuthStatus;
  admin: AdminProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Помилки з Supabase Auth приходять англійською — тут лише кілька
// найчастіших випадків, решту показуємо як є.
function translateAuthError(message: string) {
  if (message.includes('Invalid login credentials')) return 'Невірний email або пароль';
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function applySession(session: Session | null) {
      if (!session) {
        if (!cancelled) {
          setAdmin(null);
          setStatus('signed-out');
        }
        return;
      }

      const { data, error } = await supabase
        .from('admin_users')
        .select('id, email, full_name, role, is_active')
        .eq('id', session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data || !data.is_active) {
        // Валідна сесія Supabase Auth, але без "перепустки" в admin_users
        // (або доступ відкликано) — вихід, у панель не пускаємо.
        await supabase.auth.signOut();
        setAdmin(null);
        setStatus('unauthorized');
        return;
      }

      setAdmin(data as AdminProfile);
      setStatus('signed-in');
    }

    supabase.auth.getSession().then(({ data }) => applySession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    setStatus('loading');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus('signed-out');
      return { error: translateAuthError(error.message) };
    }
    // onAuthStateChange підхопить сесію й перевірить admin_users сам.
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAdmin(null);
    setStatus('signed-out');
  }

  const value = useMemo(() => ({ status, admin, signIn, signOut }), [status, admin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth має використовуватись усередині AuthProvider');
  return ctx;
}
