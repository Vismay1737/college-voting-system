import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api';

export default function VoterLogin() {
  const [usn, setUsn] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usn.trim() || !password.trim()) {
      toast.error('Please enter USN and password');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/voter/login', { usn: usn.trim(), password });
      localStorage.setItem('voter_token', res.data.access_token);
      localStorage.setItem('voter_user', JSON.stringify({
        id: res.data.user_id,
        name: res.data.user_name,
        usn: usn.trim().toUpperCase(),
      }));
      toast.success('Login successful');
      navigate('/voter/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-950 via-primary-950/30 to-surface-950 p-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-primary-500/3 rounded-full blur-3xl animate-pulse-soft"></div>
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-accent-500/3 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="glass-card p-8 w-full max-w-md animate-scale-in relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary-500/20 rotate-3 hover:rotate-0 transition-transform duration-500">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            CLASS ELECTION 2026
          </h1>
          <p className="text-surface-400 text-sm mt-2">Secure Electronic Voting System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="voter-usn" className="label-text">USN (University Seat Number)</label>
            <input
              id="voter-usn"
              type="text"
              value={usn}
              onChange={(e) => setUsn(e.target.value.toUpperCase())}
              className="input-field font-mono tracking-wider"
              placeholder="e.g., 4AJ23CS001"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="voter-password" className="label-text">Password</label>
            <input
              id="voter-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field font-mono"
              placeholder="Enter your voting password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full !py-3 text-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            )}
            {loading ? 'Signing in...' : 'Login to Vote'}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-surface-700/30">
          <p className="text-center text-xs text-surface-500">
            Use the credentials provided by your class coordinator.
            <br />Your vote is confidential and protected.
          </p>
        </div>
      </div>
    </div>
  );
}
