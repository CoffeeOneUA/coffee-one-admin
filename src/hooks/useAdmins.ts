import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import type { AdminRole } from '../lib/auth';

export interface AdminLite {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
}

export function useAdmins() {
  const [admins, setAdmins] = useState<AdminLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('admin_users')
      .select('id, email, full_name, role')
      .eq('is_active', true)
      .then(({ data }) => {
        setAdmins(data ?? []);
        setLoading(false);
      });
  }, []);

  return { admins, loading };
}

export function adminLabel(a: AdminLite | undefined | null): string {
  if (!a) return '—';
  return a.full_name?.trim() || a.email;
}
