import { useState, useEffect } from 'react';
import api from '../../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-surface-400 py-12">Failed to load dashboard data.</div>;
  }

  const statusColors = {
    DRAFT: 'badge-neutral',
    SCHEDULED: 'badge-info',
    OPEN: 'badge-success',
    PAUSED: 'badge-warning',
    CLOSED: 'badge-danger',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Dashboard</h1>
        {stats.election_status && (
          <span className={statusColors[stats.election_status] || 'badge-neutral'}>
            Election: {stats.election_status}
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="stat-value">{stats.total_students}</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="stat-card animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="stat-value">{stats.registered_voters}</div>
          <div className="stat-label">Registered Voters</div>
        </div>
        <div className="stat-card animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="stat-value">{stats.votes_cast}</div>
          <div className="stat-label">Votes Cast</div>
        </div>
        <div className="stat-card animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="stat-value">{stats.turnout_percentage}%</div>
          <div className="stat-label">Turnout</div>
        </div>
      </div>

      {/* Remaining voters */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="section-title">Remaining Voters</h3>
            <p className="text-surface-400 text-sm mt-1">{stats.remaining_voters} students haven't voted yet</p>
          </div>
          <div className="text-4xl font-bold text-amber-400">{stats.remaining_voters}</div>
        </div>
        {stats.registered_voters > 0 && (
          <div className="mt-4">
            <div className="w-full bg-surface-700/50 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-1000"
                style={{ width: `${stats.turnout_percentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-surface-500">
              <span>{stats.votes_cast} voted</span>
              <span>{stats.remaining_voters} remaining</span>
            </div>
          </div>
        )}
      </div>

      {/* Active Election */}
      {stats.active_election && (
        <div className="glass-card p-5">
          <h3 className="section-title mb-3">Active Election</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-surface-100">{stats.active_election.name}</p>
              <span className={statusColors[stats.active_election.status] || 'badge-neutral'}>
                {stats.active_election.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Class-wise stats */}
      {stats.class_stats?.length > 0 && (
        <div>
          <h3 className="section-title mb-4">Class-wise Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.class_stats.map((cls, i) => (
              <div
                key={cls.id}
                className="glass-card-hover p-5 animate-slide-up"
                style={{ animationDelay: `${i * 75}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-surface-100">{cls.name}</h4>
                  <span className="text-lg font-bold text-primary-400">{cls.turnout}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-surface-200">{cls.student_count}</div>
                    <div className="text-xs text-surface-500">Students</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-400">{cls.voted_count}</div>
                    <div className="text-xs text-surface-500">Voted</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-400">{cls.student_count - cls.voted_count}</div>
                    <div className="text-xs text-surface-500">Remaining</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-surface-700/50 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-700"
                      style={{ width: `${cls.turnout}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
