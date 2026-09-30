import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
      toast.success('Election created');
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
      toast.success(`Election ${newStatus.toLowerCase()}`);
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
    DRAFT: 'badge-neutral', SCHEDULED: 'badge-info',
    OPEN: 'badge-success', PAUSED: 'badge-warning', CLOSED: 'badge-danger',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Elections</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Election</button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="glass-card p-6 w-full max-w-lg animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-surface-100 mb-4">Create Election</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label-text">Election Name *</label>
                <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Class Election 2026" autoFocus />
              </div>
              <div>
                <label className="label-text">Description</label>
                <textarea className="input-field min-h-[80px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div>
                <label className="label-text">Eligible Classes (leave empty for all)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {classes.map(cls => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => toggleClassSelection(cls.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        form.eligible_class_ids.includes(cls.id)
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
                          : 'bg-surface-700/50 text-surface-400 border border-surface-600/30 hover:bg-surface-600/50'
                      }`}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Election</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Elections List */}
      {elections.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 bg-surface-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-surface-400">No elections yet. Create your first election.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {elections.map((election) => (
            <div key={election.id} className="glass-card-hover p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/admin/elections/${election.id}`)}>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-surface-100">{election.name}</h3>
                    <span className={statusColors[election.status] || 'badge-neutral'}>{election.status}</span>
                  </div>
                  {election.description && <p className="text-sm text-surface-400">{election.description}</p>}
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-surface-500">
                    <span>Eligible: {election.total_eligible_voters}</span>
                    <span>Votes: {election.votes_cast}</span>
                    {election.eligible_classes?.length > 0 && (
                      <span>Classes: {election.eligible_classes.map(c => c.name).join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {election.status === 'DRAFT' && (
                    <>
                      <button onClick={() => navigate(`/admin/elections/${election.id}`)} className="btn-secondary text-sm !px-3 !py-1.5">Configure</button>
                      <button onClick={() => handleStatusChange(election.id, 'OPEN')} className="btn-success text-sm !px-3 !py-1.5">Open Voting</button>
                    </>
                  )}
                  {election.status === 'SCHEDULED' && (
                    <button onClick={() => handleStatusChange(election.id, 'OPEN')} className="btn-success text-sm !px-3 !py-1.5">Open Voting</button>
                  )}
                  {election.status === 'OPEN' && (
                    <>
                      <button onClick={() => handleStatusChange(election.id, 'PAUSED')} className="btn-secondary text-sm !px-3 !py-1.5">Pause</button>
                      <button onClick={() => handleStatusChange(election.id, 'CLOSED')} className="btn-danger text-sm !px-3 !py-1.5">Close</button>
                    </>
                  )}
                  {election.status === 'PAUSED' && (
                    <>
                      <button onClick={() => handleStatusChange(election.id, 'OPEN')} className="btn-success text-sm !px-3 !py-1.5">Resume</button>
                      <button onClick={() => handleStatusChange(election.id, 'CLOSED')} className="btn-danger text-sm !px-3 !py-1.5">Close</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
