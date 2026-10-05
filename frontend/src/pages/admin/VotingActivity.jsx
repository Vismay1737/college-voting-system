import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api';

export default function VotingActivity() {
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadElections(); }, []);

  useEffect(() => {
    if (selectedElection) loadActivity();
  }, [selectedElection]);

  const loadElections = async () => {
    try {
      const res = await api.get('/admin/elections/');
      setElections(res.data);
      if (res.data.length > 0) {
        const open = res.data.find(e => e.status === 'OPEN');
        setSelectedElection((open || res.data[0]).id);
      }
    } catch (err) {
      toast.error('Failed to load elections');
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      const res = await api.get(`/admin/elections/${selectedElection}/activity`);
      setActivity(res.data.activity || []);
    } catch (err) {
      console.error('Failed to load activity');
    }
  };

  // Auto-refresh every 5 seconds for live activity
  useEffect(() => {
    if (!selectedElection) return;
    const interval = setInterval(loadActivity, 5000);
    return () => clearInterval(interval);
  }, [selectedElection]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-surface-400 text-sm font-semibold">Connecting to Live Activity Stream...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Live Voting Activity</span>
          </h1>
          <p className="text-surface-400 text-sm mt-1">Real-time vote audit log stream as ballots are submitted.</p>
        </div>

        <div className="flex items-center gap-3">
          <select className="input-field !w-auto" value={selectedElection} onChange={e => setSelectedElection(e.target.value)}>
            {elections.map(el => <option key={el.id} value={el.id}>{el.name}</option>)}
          </select>
        </div>
      </div>

      {/* Live Stream Bar */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs font-bold text-white uppercase tracking-wider">Live Stream Active • Auto-Refreshing Every 5s</span>
        </div>
        <button onClick={loadActivity} className="btn-secondary text-xs py-1.5 px-4 font-bold flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Feed List */}
      {activity.length === 0 ? (
        <div className="glass-card p-16 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4 text-surface-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Votes Logged Yet</h3>
          <p className="text-surface-400 text-sm">Activity feed will update dynamically when voters cast their ballots.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activity.map((item, i) => (
            <div key={i} className="glass-card-hover p-4 flex items-center justify-between gap-4 border border-surface-800">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-md">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base">{item.voter_name || 'Anonymous Student'}</span>
                    <span className="font-mono text-xs text-primary-300 font-bold px-2 py-0.5 rounded-md bg-primary-500/10 border border-primary-500/20">{item.voter_usn}</span>
                  </div>
                  <span className="text-xs text-surface-400 font-medium">{item.class_name || 'Unassigned Class'}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  {new Date(item.voted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
