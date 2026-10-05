import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = async () => {
    try {
      const res = await api.get('/admin/classes/');
      setClasses(res.data);
    } catch (err) {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Class name required'); return; }
    try {
      await api.post('/admin/classes/', form);
      toast.success('Class created successfully');
      setShowCreate(false);
      setForm({ name: '', description: '' });
      loadClasses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create class');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/classes/${editingId}`, form);
      toast.success('Class updated successfully');
      setEditingId(null);
      setForm({ name: '', description: '' });
      loadClasses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update class');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete class '${name}'?`)) return;
    try {
      await api.delete(`/admin/classes/${id}`);
      toast.success('Class deleted successfully');
      loadClasses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete class');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-surface-400 text-sm font-semibold">Loading Department Classes...</p>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Class Management</span>
          </h1>
          <p className="text-surface-400 text-sm mt-1">Organize student batches, branches, and class divisions.</p>
        </div>

        <button
          onClick={() => { setShowCreate(true); setForm({ name: '', description: '' }); }}
          className="btn-primary flex items-center justify-center gap-2 py-3 px-6 shadow-xl shadow-primary-500/25"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Create New Class</span>
        </button>
      </div>

      {/* Modal Dialog */}
      {(showCreate || editingId) && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => { setShowCreate(false); setEditingId(null); }}>
          <div className="glass-card p-8 w-full max-w-lg border border-surface-700/60 shadow-2xl animate-scale-in relative z-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-800">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-400"></span>
                <span>{editingId ? 'Edit Class Details' : 'Add New Class'}</span>
              </h2>
              <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="text-surface-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-5">
              <div>
                <label className="label-text">Class / Branch Name *</label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. CSE 3rd Year - Sec A"
                  autoFocus
                />
              </div>
              <div>
                <label className="label-text">Description / Notes</label>
                <textarea
                  className="input-field min-h-[90px] py-3 resize-none"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g., Computer Science Department 2023-2027 batch"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-surface-800">
                <button type="button" onClick={() => { setShowCreate(false); setEditingId(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary px-8">{editingId ? 'Save Changes' : 'Create Class'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Cards Grid */}
      {classes.length === 0 ? (
        <div className="glass-card p-16 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4 text-surface-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Classes Found</h3>
          <p className="text-surface-400 text-sm mb-6">Create classes first to import and organize voters.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">Create Your First Class</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => {
            const turnout = cls.student_count > 0 ? ((cls.voted_count / cls.student_count) * 100).toFixed(1) : 0;
            return (
              <div key={cls.id} className="glass-card-hover p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl pointer-events-none"></div>

                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-extrabold text-white text-xl tracking-tight">{cls.name}</h3>
                      {cls.description && <p className="text-xs text-surface-400 mt-1 line-clamp-2">{cls.description}</p>}
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditingId(cls.id); setForm({ name: cls.name, description: cls.description || '' }); }}
                        className="p-2 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
                        title="Edit Class"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(cls.id, cls.name)}
                        className="p-2 rounded-xl text-surface-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Class"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Class Stats Pill */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-surface-950/70 rounded-xl border border-surface-800 my-4 text-center">
                    <div>
                      <div className="text-lg font-extrabold text-white">{cls.student_count}</div>
                      <div className="text-[10px] uppercase font-bold text-surface-400">Total Enrolled</div>
                    </div>
                    <div>
                      <div className="text-lg font-extrabold text-emerald-400">{cls.voted_count}</div>
                      <div className="text-[10px] uppercase font-bold text-surface-400">Voted</div>
                    </div>
                    <div>
                      <div className="text-lg font-extrabold text-primary-400">{turnout}%</div>
                      <div className="text-[10px] uppercase font-bold text-surface-400">Turnout</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-surface-400 mb-1.5">
                    <span>Class Voting Progress</span>
                    <span>{cls.voted_count}/{cls.student_count}</span>
                  </div>
                  <div className="w-full bg-surface-950 rounded-full h-2.5 overflow-hidden border border-surface-800">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${turnout}%` }}
                    />
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
