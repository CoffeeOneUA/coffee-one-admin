import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, type AdminRole } from '../lib/auth';

// Обгортка для маршрутів: пускає лише залогінених адмінів з дійсним
// (активним) рядком у admin_users. Необов'язковий `role` додатково звужує
// доступ до конкретної ролі — суперадмін проходить будь-яку такою перевірку.
export default function RequireAuth({ children, role }: { children: ReactNode; role?: AdminRole }) {
  const { status, admin } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen text-[#8893A2] font-medium">
        Завантаження…
      </div>
    );
  }

  if (status !== 'signed-in' || !admin) {
    return <Navigate to="/login" replace />;
  }

  if (role && admin.role !== role && admin.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-5xl mb-3">🔒</div>
          <div className="text-xl font-bold text-[#20303C] mb-2">Немає доступу</div>
          <p className="text-[#8893A2]">Цей розділ доступний лише суперадміну.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
