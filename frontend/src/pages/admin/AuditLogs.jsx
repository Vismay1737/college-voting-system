import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => { loadLogs(); }, [page, filterAction]);

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filterAction) params.append('action', filterAction);
      params.append('page', page);
      params.append('page_size', 50);

      const res = await api.get(`/admin/audit-logs/?${params}`);
      setLogs(res.data);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const actionColors = {
    admin_login: 'text-blue-400',
    admin_login_failed: 'text-red-400',
    voter_login_failed: 'text-red-400',
    election_created: 'text-emerald-400',
    election_open: 'text-emerald-400',
    election_closed: 'text-red-400',
    election_paused: 'text-amber-400',
    voters_imported: 'text-emerald-400',
    password_reset: 'text-amber-400',
    class_created: 'text-blue-400',
    candidate_added: 'text-emerald-400',
    candidate_removed: 'text-red-400',
    voter_disabled: 'text-red-400',
    voter_enabled: 'text-emerald-400',
    results_viewed: 'text-blue-400',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Audit Logs</h1>
        <input
          className="input-field !w-auto"
          placeholder="Filter by action..."
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(1); }}
        />
      </div>

      {logs.length === 0 ? (
        <div className="glass-card p-12 text-center text-surface-400">No audit logs found.</div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="glass-card p-4 flex items-start gap-4">
              <div className="w-8 h-8 bg-surface-700/50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className={`w-4 h-4 ${actionColors[log.action] || 'text-surface-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${actionColors[log.action] || 'text-surface-300'}`}>
                    {log.action.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className="badge-neutral text-xs">{log.actor_type}</span>
                  {log.actor_name && <span className="text-xs text-surface-500">{log.actor_name}</span>}
                </div>
                {log.details && <p className="text-sm text-surface-400 mt-0.5">{log.details}</p>}
              </div>
              <div className="text-xs text-surface-500 flex-shrink-0">
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm !px-3 !py-1.5">← Prev</button>
        <span className="px-4 py-1.5 text-sm text-surface-400">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={logs.length < 50} className="btn-secondary text-sm !px-3 !py-1.5">Next →</button>
      </div>
    </div>
  );
}
