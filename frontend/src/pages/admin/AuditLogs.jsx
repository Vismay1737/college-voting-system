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

  const actionBadges = {
    admin_login: 'badge-info',
    admin_login_failed: 'badge-danger',
    voter_login_failed: 'badge-danger',
    election_created: 'badge-success',
    election_open: 'badge-success',
    election_closed: 'badge-danger',
    election_paused: 'badge-warning',
    voters_imported: 'badge-success',
    password_reset: 'badge-warning',
    class_created: 'badge-info',
    candidate_added: 'badge-success',
    candidate_removed: 'badge-danger',
    voter_disabled: 'badge-danger',
    voter_enabled: 'badge-success',
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-surface-400 text-sm font-semibold">Retrieving Cryptographic Audit Logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>System Audit Trail</span>
          </h1>
          <p className="text-surface-400 text-sm mt-1">Immutable security trail tracking system events, logins, and status mutations.</p>
        </div>

        <div className="w-full sm:w-auto">
          <input
            className="input-field"
            placeholder="Filter by action name..."
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="glass-card p-16 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4 text-surface-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Audit Log Records</h3>
          <p className="text-surface-400 text-sm">System audit events will be logged here in chronological sequence.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="glass-card-hover p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-surface-800">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-950 border border-surface-800 flex items-center justify-center text-primary-400 font-mono text-xs flex-shrink-0 mt-0.5">
                  #{log.id}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={actionBadges[log.action] || 'badge-neutral'}>
                      {log.action.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-surface-300">By: {log.actor_name || log.actor_type}</span>
                  </div>

                  {log.details && <p className="text-sm text-surface-400 mt-1 font-medium">{log.details}</p>}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="text-xs font-mono font-semibold text-surface-400">
                  {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between glass-card p-4">
        <span className="text-xs text-surface-400 font-semibold">Page {page}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-xs !px-4 !py-2"
          >
            ← Previous
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={logs.length < 50}
            className="btn-secondary text-xs !px-4 !py-2"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
