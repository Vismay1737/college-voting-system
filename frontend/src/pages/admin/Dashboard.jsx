import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-surface-400 text-sm font-semibold animate-pulse">Loading Live Election Metrics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="glass-card p-12 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Failed to Load Dashboard</h3>
        <p className="text-surface-400 text-sm mb-6">Unable to connect to database serverless endpoints.</p>
        <button onClick={loadStats} className="btn-primary">Retry Connection</button>
      </div>
    );
  }

  const statusColors = {
    DRAFT: 'badge-neutral',
    SCHEDULED: 'badge-info',
    OPEN: 'badge-success',
    PAUSED: 'badge-warning',
    CLOSED: 'badge-danger',
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Header */}
      <div className="glass-card p-8 bg-gradient-to-r from-surface-950 via-primary-950/40 to-surface-950 border border-primary-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Live Election Hub</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">System Overview</h1>
            <p className="text-surface-300 text-sm mt-1 max-w-xl">
              Monitor real-time student voter turnouts, active election progress, and department participation.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/admin/elections" className="btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Manage Elections</span>
            </Link>
            <Link to="/admin/voters" className="btn-secondary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>View Voters</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Total Registered</span>
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div>
            <div className="stat-value">{stats.total_students}</div>
            <p className="text-xs text-surface-400 mt-1">Total Enrolled Students</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Active Eligible Voters</span>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <div className="stat-value text-sky-300">{stats.registered_voters}</div>
            <p className="text-xs text-surface-400 mt-1">Verified Credentials Active</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Total Votes Cast</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
          <div>
            <div className="stat-value text-emerald-400">{stats.votes_cast}</div>
            <p className="text-xs text-surface-400 mt-1">Ballots Recorded in DB</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Voter Turnout</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div>
            <div className="stat-value text-purple-300">{stats.turnout_percentage}%</div>
            <p className="text-xs text-surface-400 mt-1">Overall Participation Rate</p>
          </div>
        </div>
      </div>

      {/* Active Election & Voter Participation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Turnout Progress Bar Widget */}
        <div className="glass-card p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Participation Progress</h3>
              <span className="text-sm font-bold text-surface-300">{stats.votes_cast} / {stats.registered_voters} Voted</span>
            </div>

            <div className="relative pt-2">
              <div className="w-full bg-surface-950 rounded-full h-4 overflow-hidden border border-surface-800">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-1000 shadow-md shadow-emerald-500/20"
                  style={{ width: `${Math.min(stats.turnout_percentage, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-surface-950/60 border border-surface-800">
                <p className="text-xs text-surface-400 font-semibold uppercase">Voted</p>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.votes_cast}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-950/60 border border-surface-800">
                <p className="text-xs text-surface-400 font-semibold uppercase">Remaining</p>
                <p className="text-2xl font-extrabold text-amber-400 mt-1">{stats.remaining_voters}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-950/60 border border-surface-800 col-span-2 sm:col-span-1">
                <p className="text-xs text-surface-400 font-semibold uppercase">Completion Rate</p>
                <p className="text-2xl font-extrabold text-indigo-400 mt-1">{stats.turnout_percentage}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Election Widget */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Active Election</h3>
              {stats.election_status && (
                <span className={statusColors[stats.election_status] || 'badge-neutral'}>
                  {stats.election_status}
                </span>
              )}
            </div>

            {stats.active_election ? (
              <div className="p-5 rounded-2xl bg-surface-950/80 border border-surface-800 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-base">{stats.active_election.name}</h4>
                    <p className="text-xs text-surface-400 mt-0.5">ID #{stats.active_election.id}</p>
                  </div>
                </div>

                <Link
                  to={`/admin/elections/${stats.active_election.id}`}
                  className="btn-primary w-full text-center flex items-center justify-center gap-2 py-2.5 text-xs font-bold"
                >
                  <span>Manage Election & Candidates</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 text-surface-400">
                <p className="text-sm font-medium mb-3">No active election currently open.</p>
                <Link to="/admin/elections" className="btn-secondary text-xs font-bold">
                  Create New Election
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Class Wise Stats Section */}
      {stats.class_stats?.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Department & Class Breakdown</h3>
            <Link to="/admin/classes" className="text-xs font-bold text-primary-400 hover:text-primary-300 flex items-center gap-1">
              <span>View All Classes ({stats.class_stats.length})</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stats.class_stats.map((cls) => (
              <div key={cls.id} className="glass-card-hover p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-extrabold text-white text-base">{cls.name}</h4>
                    <span className="text-sm font-extrabold text-primary-400 px-2.5 py-1 rounded-lg bg-primary-500/10 border border-primary-500/20">
                      {cls.turnout}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 bg-surface-950/60 rounded-xl border border-surface-800/80 text-center mb-4">
                    <div>
                      <div className="text-base font-extrabold text-white">{cls.student_count}</div>
                      <div className="text-[10px] uppercase font-semibold text-surface-400">Students</div>
                    </div>
                    <div>
                      <div className="text-base font-extrabold text-emerald-400">{cls.voted_count}</div>
                      <div className="text-[10px] uppercase font-semibold text-surface-400">Voted</div>
                    </div>
                    <div>
                      <div className="text-base font-extrabold text-amber-400">{cls.student_count - cls.voted_count}</div>
                      <div className="text-[10px] uppercase font-semibold text-surface-400">Pending</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="w-full bg-surface-950 rounded-full h-2 overflow-hidden border border-surface-800">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-emerald-400 rounded-full transition-all duration-700"
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
