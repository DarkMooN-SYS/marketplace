import { useCallback, useEffect, useState } from 'react';
import { api, type User } from '../../api/adminApi';
import { AlertTriangle, Loader2, RefreshCcw } from 'lucide-react';
import AdminContactHub from '../../components/AdminContactHub';

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusClasses = (status: User['status']) => {
    if (status === 'active') {
      return 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-200';
    }
    if (status === 'suspended') {
      return 'bg-red-500/10 text-red-500 dark:bg-red-400/15 dark:text-red-200';
    }
    return 'bg-amber-500/10 text-amber-500 dark:bg-amber-400/15 dark:text-amber-200';
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.users.getAll();
      setUsers(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Мэдэгдээгүй алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
            Нийт {users.length} хэрэглэгч
          </p>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:border-white/15 dark:text-white"
        >
          <RefreshCcw className="h-4 w-4" />
          Дахин ачаалах
        </button>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-[var(--color-border-soft)] bg-white/70 dark:border-white/15 dark:bg-white/5">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-border-main)]" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-600 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Өгөгдөл татахад алдаа гарлаа</p>
              <p>{error}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 sm:hidden">
              {users.map((user) => (
                  <div
                    key={user.id}
                    className="w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/85 p-4 shadow-sm dark:border-white/12 dark:bg-white/5"
                  >
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar || '/img/human.png'}
                    alt={user.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-[var(--color-text-main)] dark:text-white">{user.name}</p>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-main)]/60 dark:text-white/60">
                      {user.role}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-[var(--color-text-main)]/75 dark:text-white/70">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--color-text-main)] dark:text-white">Утас</span>
                    <span>{user.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--color-text-main)] dark:text-white">Оноо</span>
                    <span>{(user.points || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--color-text-main)] dark:text-white">Бүртгэл</span>
                    <span>
                      {new Date(user.joinedAt || user.createdAt).toLocaleDateString('mn-MN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${getStatusClasses(user.status)}`}
                  >
                    {user.status}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.3em] text-[var(--color-text-main)]/40 dark:text-white/40">
                    #{user.id}
                  </span>
                </div>
                  </div>
              ))}
            </div>

            <div className="hidden sm:block">
              <div className="overflow-x-auto rounded-2xl border border-[var(--color-border-soft)] bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5">
                <table className="min-w-[760px] divide-y divide-[var(--color-border-soft)]/70 text-sm dark:divide-white/10">
                  <thead className="bg-[var(--color-border-soft)]/20 dark:bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-main)] dark:text-white">Нэр</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-main)] dark:text-white">Утас</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-main)] dark:text-white">Статус</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-main)] dark:text-white">Оноо</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-main)] dark:text-white">Бүртгүүлсэн</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-soft)]/70 dark:divide-white/10">
                    {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={user.avatar || '/img/human.png'}
                                alt={user.name}
                                className="h-9 w-9 rounded-full object-cover"
                              />
                              <div>
                                <p className="font-semibold text-[var(--color-text-main)] dark:text-white">{user.name}</p>
                                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-main)]/60 dark:text-white/50">{user.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[var(--color-text-main)]/80 dark:text-white/70">{user.phone}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${getStatusClasses(user.status)}`}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[var(--color-text-main)] dark:text-white">{(user.points || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-[var(--color-text-main)]/70 dark:text-white/60">
                            {new Date(user.joinedAt || user.createdAt).toLocaleDateString('mn-MN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <AdminContactHub className="space-y-4" />
      </div>
    </>
  );
}
