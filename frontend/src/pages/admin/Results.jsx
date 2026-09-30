import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api';

export default function Results() {
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadElections(); }, []);

  useEffect(() => {
    if (selectedElection) loadResults();
  }, [selectedElection]);

  const loadElections = async () => {
    try {
      const res = await api.get('/admin/elections/');
      setElections(res.data);
      const closed = res.data.find(e => e.status === 'CLOSED');
      if (closed) setSelectedElection(closed.id);
      else if (res.data.length > 0) setSelectedElection(res.data[0].id);
    } catch (err) {
      toast.error('Failed to load elections');
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async () => {
    try {
      const res = await api.get(`/admin/elections/${selectedElection}/results`);
      setResults(res.data);
    } catch (err) {
      setResults(null);
      if (err.response?.status !== 400) {
        toast.error('Failed to load results');
      }
    }
  };

  const exportCSV = () => {
    if (!results) return;
    let csv = "Post,Candidate,Votes,Percentage\n";
    results.posts.forEach(post => {
      post.candidates.forEach(c => {
        csv += `"${post.post_title}","${c.name}",${c.votes},${c.percentage}%\n`;
      });
    });
    csv += `\nTurnout\nTotal Eligible,${results.turnout.total_eligible}\nVotes Cast,${results.turnout.votes_cast}\nTurnout %,${results.turnout.percentage}%\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `election_results_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Results exported');
  };

  const printResults = () => window.print();

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between no-print">
        <h1 className="page-title">Election Results</h1>
        <select className="input-field !w-auto" value={selectedElection} onChange={e => setSelectedElection(e.target.value)}>
          {elections.map(el => <option key={el.id} value={el.id}>{el.name} ({el.status})</option>)}
        </select>
      </div>

      {!results ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 bg-surface-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-surface-400">Results are only available after the election is closed.</p>
        </div>
      ) : (
        <>
          {/* Export buttons */}
          <div className="flex gap-2 no-print">
            <button onClick={exportCSV} className="btn-secondary text-sm">📥 Export CSV</button>
            <button onClick={printResults} className="btn-secondary text-sm">🖨 Print</button>
          </div>

          {/* Turnout Overview */}
          <div className="glass-card p-5">
            <h2 className="section-title mb-4">Turnout Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="stat-card !p-3">
                <div className="text-2xl font-bold text-surface-200">{results.turnout.total_eligible}</div>
                <div className="text-xs text-surface-500">Registered</div>
              </div>
              <div className="stat-card !p-3">
                <div className="text-2xl font-bold text-emerald-400">{results.turnout.votes_cast}</div>
                <div className="text-xs text-surface-500">Votes Cast</div>
              </div>
              <div className="stat-card !p-3">
                <div className="text-2xl font-bold text-amber-400">{results.turnout.not_voted}</div>
                <div className="text-xs text-surface-500">Not Voted</div>
              </div>
              <div className="stat-card !p-3">
                <div className="text-2xl font-bold text-primary-400">{results.turnout.percentage}%</div>
                <div className="text-xs text-surface-500">Turnout</div>
              </div>
            </div>
          </div>

          {/* Class-wise Turnout */}
          {results.class_turnout?.length > 0 && (
            <div className="glass-card p-5">
              <h2 className="section-title mb-4">Class-wise Turnout</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {results.class_turnout.map(ct => (
                  <div key={ct.class_id} className="bg-surface-800/50 rounded-xl p-4 border border-surface-700/30">
                    <h3 className="font-semibold text-surface-200 mb-2">{ct.class_name}</h3>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div><div className="font-bold text-surface-300">{ct.total}</div><div className="text-xs text-surface-500">Registered</div></div>
                      <div><div className="font-bold text-emerald-400">{ct.voted}</div><div className="text-xs text-surface-500">Voted</div></div>
                      <div><div className="font-bold text-primary-400">{ct.turnout}%</div><div className="text-xs text-surface-500">Turnout</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post Results */}
          {results.posts.map(post => (
            <div key={post.post_id} className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">{post.post_title}</h2>
                <span className="text-sm text-surface-500">Total: {post.total_votes} votes</span>
              </div>
              <div className="space-y-3">
                {post.candidates.map((candidate, i) => {
                  const isWinner = i === 0 && candidate.votes > 0;
                  return (
                    <div key={candidate.id} className={`p-4 rounded-xl border ${isWinner ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-surface-800/30 border-surface-700/30'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {isWinner && <span className="text-lg">🏆</span>}
                          <div>
                            <span className="font-semibold text-surface-200">{candidate.name}</span>
                            {candidate.usn && <span className="text-xs text-surface-500 ml-2">{candidate.usn}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-surface-200">{candidate.votes}</span>
                          <span className="text-sm text-surface-500 ml-1">({candidate.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-surface-700/50 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${isWinner ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-primary-500 to-primary-400'}`}
                          style={{ width: `${candidate.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
