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
      toast.success('Class created');
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
      toast.success('Class updated');
      setEditingId(null);
      setForm({ name: '', description: '' });
      loadClasses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update class');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this class?')) return;
    try {
      await api.delete(`/admin/classes/${id}`);
      toast.success('Class deleted');
      loadClasses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete class');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Classes</h1>
        <button onClick={() => { setShowCreate(true); setForm({ name: '', description: '' }); }} className="btn-primary">+ New Class</button>
      </div>

      {/* Create/Edit Modal */}
      {(showCreate || editingId) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowCreate(false); setEditingId(null); }}>
          <div className="glass-card p-6 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-surface-100 mb-4">{editingId ? 'Edit Class' : 'Create Class'}</h2>
            <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="label-text">Class Name *</label>
                <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., CSE-A" autoFocus />
              </div>
              <div>
                <label className="label-text">Description</label>
                <input className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowCreate(false); setEditingId(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {classes.length === 0 ? (
        <div className="glass-card p-12 text-center text-surface-400">
          No classes created yet. Create classes to organize students.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div key={cls.id} className="glass-card-hover p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-surface-100 text-lg">{cls.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingId(cls.id); setForm({ name: cls.name, description: cls.description || '' }); }} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(cls.id)} className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              {cls.description && <p className="text-sm text-surface-400 mb-3">{cls.description}</p>}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xl font-bold text-surface-200">{cls.student_count}</div>
                  <div className="text-xs text-surface-500">Students</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-emerald-400">{cls.voted_count}</div>
                  <div className="text-xs text-surface-500">Voted</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-primary-400">
                    {cls.student_count > 0 ? ((cls.voted_count / cls.student_count) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-xs text-surface-500">Turnout</div>
                </div>
              </div>
              {cls.student_count > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-surface-700/50 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full" style={{ width: `${(cls.voted_count / cls.student_count) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
