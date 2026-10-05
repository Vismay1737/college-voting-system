import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api';

export default function VoterDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/voter/dashboard');
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load voter dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('voter_token');
    localStorage.removeItem('voter_user');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-surface-400 text-sm font-semibold">Loading Student Portal...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#030712] mesh-grid text-surface-100 font-sans relative pb-12">
      {/* Top Glass Navbar */}
      <header className="border-b border-surface-800/80 bg-surface-950/80 backdrop-blur-2xl sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">Student E-Voting Portal</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Class Elections 2026</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/login"
              className="text-xs text-surface-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-900 border border-surface-800"
            >
              <svg className="w-3.5 h-3.5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Admin Portal</span>
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 px-3.5 py-1.5 rounded-xl border border-rose-500/20 transition-all font-bold flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-8 relative z-10">
        {/* Student Welcome Profile Banner */}
        <div className="glass-card p-8 bg-gradient-to-r from-surface-950 via-teal-950/20 to-surface-950 border border-emerald-500/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-extrabold text-white text-2xl shadow-xl shadow-emerald-500/30 flex-shrink-0">
              {(data.voter.name || data.voter.usn)[0].toUpperCase()}
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Authenticated Voter</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {data.voter.name || 'Student Voter'}
              </h1>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <span className="font-mono text-xs font-bold text-emerald-300 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  USN: {data.voter.usn}
                </span>

                {data.voter.class_name && (
                  <span className="text-xs font-semibold text-surface-300 px-3 py-1 rounded-lg bg-surface-900 border border-surface-800">
                    Class: {data.voter.class_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Voting Status Card */}
        {data.election ? (
          <div className="glass-card p-8 border border-surface-800/80 shadow-2xl relative overflow-hidden">
            <div className="mb-6 pb-6 border-b border-surface-800">
              <span className="text-xs font-bold uppercase tracking-wider text-surface-400">Target Election</span>
              <h2 className="text-2xl font-extrabold text-white mt-1">{data.election.name}</h2>
              {data.election.description && <p className="text-surface-300 text-sm mt-2">{data.election.description}</p>}
            </div>

            {data.has_voted ? (
              /* Already Voted Confirmation */
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 shadow-xl shadow-emerald-500/20">
                  <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-extrabold text-emerald-400 tracking-tight">BALLOT RECORDED & CONFIRMED</h3>
                <p className="text-surface-300 text-sm max-w-md mx-auto">
                  Your electronic vote has been cryptographically recorded and tallied in the database.
                  <br />Thank you for participating!
                </p>
              </div>
            ) : (
              /* Ready to Vote Call-to-action */
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-950 border border-surface-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Voting Open</span>
                  </div>
                  <span className="badge-success">{data.election.status}</span>
                </div>

                <button
                  onClick={() => navigate(`/voter/vote/${data.election.id}`)}
                  className="btn-success w-full py-5 text-xl font-extrabold tracking-wide flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50"
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>PROCEED TO VOTING BOOTH →</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4 text-surface-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No Active Elections</h3>
            <p className="text-surface-400 text-sm">There are no voting polls open for your batch at this moment.</p>
          </div>
        )}
      </main>
    </div>
  );
}
