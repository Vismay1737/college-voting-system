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
    let csv = "Post,Candidate,USN,Votes,Percentage\n";
    results.posts.forEach(post => {
      post.candidates.forEach(c => {
        csv += `"${post.post_title}","${c.name}","${c.usn || ''}",${c.votes},${c.percentage}%\n`;
      });
    });
    csv += `\nTurnout Overview\nTotal Eligible,${results.turnout.total_eligible}\nVotes Cast,${results.turnout.votes_cast}\nTurnout %,${results.turnout.percentage}%\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `election_results_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Election results exported as CSV');
  };

  const printResults = () => window.print();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-surface-400 text-sm font-semibold">Tallying Certified Election Results...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="page-title">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Election Results & Analytics</span>
          </h1>
          <p className="text-surface-400 text-sm mt-1">Certified tallies, winning candidate breakdowns, and export reports.</p>
        </div>

        <div className="flex items-center gap-3">
          <select className="input-field !w-auto font-semibold" value={selectedElection} onChange={e => setSelectedElection(e.target.value)}>
            {elections.map(el => <option key={el.id} value={el.id}>{el.name} ({el.status})</option>)}
          </select>
        </div>
      </div>

      {!results ? (
        <div className="glass-card p-16 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4 text-surface-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Results Sealed</h3>
          <p className="text-surface-400 text-sm">Election results are encrypted and sealed until the election is officially CLOSED by the administrator.</p>
        </div>
      ) : (
        <>
          {/* Action Bar */}
          <div className="flex items-center justify-between no-print">
            <div className="flex gap-3">
              <button onClick={exportCSV} className="btn-secondary text-xs font-bold py-2 px-4 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span>Export CSV Report</span>
              </button>
              <button onClick={printResults} className="btn-secondary text-xs font-bold py-2 px-4 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                <span>Print Official Certificate</span>
              </button>
            </div>
          </div>

          {/* Turnout Stats Card */}
          <div className="glass-card p-6 border border-surface-800">
            <h2 className="section-title mb-4">Certified Turnout Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-surface-950 border border-surface-800">
                <p className="text-xs font-bold uppercase text-surface-400">Total Eligible</p>
                <p className="text-2xl font-extrabold text-white mt-1">{results.turnout.total_eligible}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-950 border border-surface-800">
                <p className="text-xs font-bold uppercase text-surface-400">Votes Cast</p>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">{results.turnout.votes_cast}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-950 border border-surface-800">
                <p className="text-xs font-bold uppercase text-surface-400">Total Turnout</p>
                <p className="text-2xl font-extrabold text-primary-300 mt-1">{results.turnout.percentage}%</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-950 border border-surface-800">
                <p className="text-xs font-bold uppercase text-surface-400">Positions Tallied</p>
                <p className="text-2xl font-extrabold text-indigo-300 mt-1">{results.posts.length}</p>
              </div>
            </div>
          </div>

          {/* Posts & Winner Standings */}
          <div className="space-y-8">
            {results.posts.map((post) => {
              const sortedCandidates = [...post.candidates].sort((a, b) => b.votes - a.votes);
              const maxVotes = sortedCandidates[0]?.votes || 0;

              return (
                <div key={post.post_id} className="glass-card p-8 border border-surface-800 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-surface-800">
                    <div>
                      <h3 className="text-2xl font-extrabold text-white">{post.post_title}</h3>
                      <p className="text-xs text-surface-400 mt-0.5">Total Ballots Cast for Post: {post.total_votes_cast}</p>
                    </div>
                  </div>

                  {/* Candidates Tally Bars */}
                  <div className="space-y-4">
                    {sortedCandidates.map((candidate, idx) => {
                      const isWinner = idx === 0 && candidate.votes > 0;
                      return (
                        <div
                          key={candidate.id}
                          className={`p-5 rounded-2xl border transition-all ${
                            isWinner
                              ? 'bg-gradient-to-r from-amber-500/10 via-surface-950 to-surface-950 border-amber-500/40 shadow-xl shadow-amber-500/5'
                              : 'bg-surface-950/80 border-surface-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl font-extrabold flex items-center justify-center text-sm ${
                                isWinner
                                  ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-surface-950 shadow-md'
                                  : 'bg-surface-800 text-surface-300'
                              }`}>
                                {isWinner ? '👑' : `#${idx + 1}`}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-extrabold text-white text-lg">{candidate.name}</h4>
                                  {isWinner && (
                                    <span className="badge-warning text-[10px]">
                                      Winner • {candidate.percentage}%
                                    </span>
                                  )}
                                </div>
                                {candidate.usn && <p className="font-mono text-xs text-surface-400">{candidate.usn}</p>}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-2xl font-extrabold text-white">{candidate.votes} <span className="text-xs font-normal text-surface-400">Votes</span></div>
                              <div className="text-xs font-bold text-primary-400">{candidate.percentage}%</div>
                            </div>
                          </div>

                          <div className="w-full bg-surface-900 rounded-full h-3 overflow-hidden border border-surface-800">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                isWinner
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-md shadow-amber-500/20'
                                  : 'bg-gradient-to-r from-primary-600 to-indigo-500'
                              }`}
                              style={{ width: `${candidate.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
