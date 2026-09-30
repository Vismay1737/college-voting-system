import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api';

export default function VoterDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const voterUser = JSON.parse(localStorage.getItem('voter_user') || '{}');

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/voter/dashboard');
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('voter_token');
    localStorage.removeItem('voter_user');
    toast.success('Logged out');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      {/* Header */}
      <header className="border-b border-surface-700/50 bg-surface-900/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-bold text-surface-100 text-sm">Election 2026</span>
          </div>
          <button onClick={handleLogout} className="text-sm text-surface-400 hover:text-red-400 transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome Card */}
        <div className="glass-card p-6 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-2xl flex items-center justify-center border border-primary-500/20">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                {(data.voter.name || data.voter.usn)[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-surface-100">
                Welcome, {data.voter.name || data.voter.usn}
              </h1>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-surface-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  {data.voter.usn}
                </span>
                {data.voter.class_name && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {data.voter.class_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Election Card */}
        {data.election ? (
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-lg font-semibold text-surface-100 mb-1">{data.election.name}</h2>
            {data.election.description && (
              <p className="text-sm text-surface-400 mb-4">{data.election.description}</p>
            )}

            {data.has_voted ? (
              /* Already Voted */
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-emerald-400 mb-1">✓ VOTE SUBMITTED</h3>
                <p className="text-surface-400 text-sm">
                  You have already voted in this election.
                  <br />Thank you for participating.
                </p>
              </div>
            ) : (
              /* Not Voted Yet */
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="badge-info">Voting Status: NOT VOTED</span>
                  <span className="badge-success">{data.election.status}</span>
                </div>
                <button
                  onClick={() => navigate(`/voter/vote/${data.election.id}`)}
                  className="w-full py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white font-bold text-lg rounded-2xl
                           shadow-xl shadow-primary-500/25 hover:shadow-2xl hover:shadow-primary-500/30
                           active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  CAST YOUR VOTE
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-8 text-center animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="w-16 h-16 bg-surface-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-surface-300 mb-1">No Active Election</h3>
            <p className="text-surface-500 text-sm">There is currently no election open for voting. Please check back later.</p>
          </div>
        )}

        {/* Security Notice */}
        <div className="text-center text-xs text-surface-600 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <p>🔒 Your vote is confidential and protected by end-to-end encryption.</p>
          <p className="mt-1">This system uses secret ballot — your selections are anonymous.</p>
        </div>
      </main>
    </div>
  );
}
