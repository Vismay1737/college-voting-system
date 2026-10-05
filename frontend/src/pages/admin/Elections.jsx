import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api';

export default function Elections() {
  const [elections, setElections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', eligible_class_ids: [] });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [electionsRes, classesRes] = await Promise.all([
        api.get('/admin/elections/'),
        api.get('/admin/classes/'),
      ]);
      setElections(electionsRes.data);
      setClasses(classesRes.data);
    } catch (err) {
      toast.error('Failed to load elections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Election name is required'); return; }
    try {
      await api.post('/admin/elections/', form);
      toast.success('Election created successfully');
      setShowCreate(false);
      setForm({ name: '', description: '', eligible_class_ids: [] });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create election');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/admin/elections/${id}/status`, { status: newStatus });
      toast.success(`Election status updated to ${newStatus}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const toggleClassSelection = (classId) => {
    setForm(prev => ({
      ...prev,
      eligible_class_ids: prev.eligible_class_ids.includes(classId)
        ? prev.eligible_class_ids.filter(id => id !== classId)
        : [...prev.eligible_class_ids, classId]
    }));
  };

  const statusColors = {
    DRAFT: 'badge-neutral',
    SCHEDULED: 'badge-info',
    OPEN: 'badge-success',
    PAUSED: 'badge-warning',
    CLOSED: 'badge-danger',
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-surface-400 text-sm font-semibold">Loading Elections Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 022 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Election Management</span>
          </h1>
          <p className="text-surface-400 text-sm mt-1">Configure voting posts, candidates, eligibility, and live state controls.</p>
        </div>

        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center justify-center gap-2 py-3 px-6 shadow-xl shadow-primary-500/25">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Create New Election</span>
        </button>
      </div>

      {/* Modal Create Election */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="glass-card p-8 w-full max-w-xl border border-surface-700/60 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-800">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-400"></span>
                <span>Create New Election</span>
              </h2>
              <button onClick={() => setShowCreate(false)} className="text-surface-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="label-text">Election Title *</label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Student Council Election 2026"
                  autoFocus
                />
              </div>

              <div>
                <label className="label-text">Description / Instructions</label>
                <textarea
                  className="input-field min-h-[90px] py-3 resize-none"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g., Annual election for President, Vice President, and General Secretary posts."
                />
              </div>

              <div>
                <label className="label-text">Eligible Classes (Select eligible student batches)</label>
                <div className="flex flex-wrap gap-2 mt-2 p-3 bg-surface-950 rounded-xl border border-surface-800 max-h-40 overflow-y-auto">
                  {classes.map(cls => {
                    const selected = form.eligible_class_ids.includes(cls.id);
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => toggleClassSelection(cls.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          selected
                            ? 'bg-primary-500/20 text-primary-300 border-primary-500/50 shadow-sm'
                            : 'bg-surface-900 text-surface-400 border-surface-700/50 hover:bg-surface-800 hover:text-white'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}{cls.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-surface-500 mt-1">If no class is selected, all registered voters are eligible by default.</p>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-surface-800">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary px-8">Create Election</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Elections List Cards */}
      {elections.length === 0 ? (
        <div className="glass-card p-16 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4 text-surface-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Elections Configured</h3>
          <p className="text-surface-400 text-sm mb-6">Create an election to add posts (President, Vice President, etc.) and candidate profiles.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">Create First Election</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {elections.map((el) => {
            const statusStr = typeof el.status === 'object' ? el.status.value || el.status : el.status;
            return (
              <div key={el.id} className="glass-card p-8 border border-surface-800/80 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-extrabold text-white tracking-tight">{el.name}</h3>
                      <span className={statusColors[statusStr] || 'badge-neutral'}>
                        {statusStr}
                      </span>
                    </div>
                    {el.description && <p className="text-surface-300 text-sm max-w-2xl">{el.description}</p>}

                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-surface-400 pt-2">
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-surface-950 rounded-lg border border-surface-800">
                        <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        <span>{el.posts?.length || 0} Position Posts</span>
                      </span>

                      <span className="flex items-center gap-1.5 px-3 py-1 bg-surface-950 rounded-lg border border-surface-800">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <span>{el.total_votes || 0} Total Ballots</span>
                      </span>
                    </div>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    {statusStr !== 'OPEN' && (
                      <button
                        onClick={() => handleStatusChange(el.id, 'OPEN')}
                        className="btn-success text-xs font-bold px-4 py-2.5 flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                        <span>Open Voting</span>
                      </button>
                    )}

                    {statusStr === 'OPEN' && (
                      <button
                        onClick={() => handleStatusChange(el.id, 'PAUSED')}
                        className="btn-secondary text-xs font-bold text-amber-400 border-amber-500/30 px-4 py-2.5 flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Pause Voting</span>
                      </button>
                    )}

                    {statusStr !== 'CLOSED' && (
                      <button
                        onClick={() => handleStatusChange(el.id, 'CLOSED')}
                        className="btn-danger text-xs font-bold px-4 py-2.5 flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                        <span>Close Election</span>
                      </button>
                    )}

                    <Link
                      to={`/admin/elections/${el.id}`}
                      className="btn-primary text-xs font-bold px-5 py-2.5 flex items-center gap-1.5"
                    >
                      <span>Manage Posts & Candidates</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
