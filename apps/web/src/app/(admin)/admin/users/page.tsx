'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';

const ROLES = ['ATTENDEE', 'ORGANIZER', 'SCANNER', 'ADMIN'];
const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-500/10 text-red-400',
  ORGANIZER: 'bg-purple-500/10 text-purple-400',
  SCANNER: 'bg-blue-500/10 text-blue-400',
  ATTENDEE: 'bg-surface-elevated text-text-secondary',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState<{ id: string; name: string; currentRole: string } | null>(null);
  const [newRole, setNewRole] = useState('');

  const load = useCallback(async (q?: string, role?: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (q) params.set('search', q);
      if (role) params.set('role', role);
      const res = await api.get<{ users: any[]; total: number }>(`/admin/users?${params}`);
      setUsers(res.users);
      setTotal(res.total);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRoleChange() {
    if (!roleModal || !newRole) return;
    setRoleChanging(roleModal.id);
    try {
      await api.patch(`/admin/users/${roleModal.id}/role`, { role: newRole });
      setRoleModal(null);
      setNewRole('');
      await load(search, roleFilter);
    } catch (err: any) {
      setError(err.message || 'Failed to change role');
    } finally {
      setRoleChanging(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="mt-1 text-sm text-text-secondary">{total} accounts</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 min-w-[200px] rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && load(search, roleFilter)}
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); load(search, e.target.value); }}
          className="rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
        >
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          onClick={() => load(search, roleFilter)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          Search
        </button>
      </div>

      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-elevated" />)}
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-[var(--color-border)]">
          <table className="min-w-full text-xs">
            <thead className="border-b border-[var(--color-border)] bg-surface-elevated">
              <tr>
                {['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-surface">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-elevated transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                  <td className="px-4 py-3 text-text-muted">{u.email}</td>
                  <td className="px-4 py-3 text-text-muted">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] || ''}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${u.status === 'ACTIVE' ? 'text-success' : 'text-error'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(u.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setRoleModal({ id: u.id, name: u.name, currentRole: u.role }); setNewRole(u.role); }}
                      className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs text-text-secondary hover:border-primary hover:text-white transition-colors"
                    >
                      Change Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="p-8 text-center text-sm text-text-muted">No users found.</div>
          )}
        </div>
      )}

      {total > users.length && (
        <p className="text-center text-xs text-text-muted">Showing {users.length} of {total}</p>
      )}

      {/* Role Change Modal */}
      {roleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-surface p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white">Change Role</h3>
            <p className="mt-1 text-sm text-text-secondary">{roleModal.name}</p>
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">New Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="mt-2 rounded-lg bg-warning/5 border border-warning/20 px-3 py-2">
              <p className="text-xs text-warning">
                {newRole === 'ADMIN' && '⚠ Granting ADMIN gives full system access.'}
                {newRole === 'ORGANIZER' && 'ORGANIZER can see event data. Assign them to specific events separately.'}
                {newRole === 'SCANNER' && 'SCANNER can only scan tickets for assigned events.'}
                {newRole === 'ATTENDEE' && 'ATTENDEE has standard access only.'}
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setRoleModal(null); setNewRole(''); }}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={roleChanging === roleModal.id || newRole === roleModal.currentRole}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {roleChanging === roleModal.id ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
