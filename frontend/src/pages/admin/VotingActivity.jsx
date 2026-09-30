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

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!selectedElection) return;
    const interval = setInterval(loadActivity, 10000);
    return () => clearInterval(interval);
  }, [selectedElection]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Voting Activity</h1>
        <select className="input-field !w-auto" value={selectedElection} onChange={e => setSelectedElection(e.target.value)}>
          {elections.map(el => <option key={el.id} value={el.id}>{el.name}</option>)}
        </select>
      </div>

      <div className="glass-card p-4 flex items-center gap-2">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-soft"></div>
        <span className="text-sm text-surface-400">Auto-refreshing every 10 seconds</span>
        <button onClick={loadActivity} className="ml-auto btn-secondary text-xs !px-3 !py-1">Refresh Now</button>
      </div>

      {activity.length === 0 ? (
        <div className="glass-card p-12 text-center text-surface-400">
          No voting activity yet for this election.
        </div>
      ) : (
        <div className="space-y-2">
          {activity.map((item, i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-4 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-surface-200">{item.voter_name}</span>
                  <span className="text-xs text-surface-500 font-mono">{item.voter_usn}</span>
                </div>
                <span className="text-xs text-surface-500">{item.class_name}</span>
              </div>
              <div className="text-xs text-surface-500">
                {new Date(item.voted_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
