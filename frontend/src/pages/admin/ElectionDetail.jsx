import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api';

export default function ElectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPost, setShowAddPost] = useState(false);
  const [showAddCandidate, setShowAddCandidate] = useState(null);
  const [postForm, setPostForm] = useState({ title: '', description: '', is_mandatory: true, display_order: 0 });
  const [candidateForm, setCandidateForm] = useState({ name: '', usn: '', class_name: '', description: '', display_order: 0 });

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [elRes, postsRes] = await Promise.all([
        api.get(`/admin/elections/${id}`),
        api.get(`/admin/elections/${id}/posts`),
      ]);
      setElection(elRes.data);
      setPosts(postsRes.data);
    } catch (err) {
      toast.error('Failed to load election details');
      navigate('/admin/elections');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPost = async (e) => {
    e.preventDefault();
    if (!postForm.title.trim()) { toast.error('Post title required'); return; }
    try {
      await api.post(`/admin/elections/${id}/posts`, postForm);
      toast.success('Post position created');
      setShowAddPost(false);
      setPostForm({ title: '', description: '', is_mandatory: true, display_order: 0 });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add post');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post position and all registered candidates?')) return;
    try {
      await api.delete(`/admin/elections/${id}/posts/${postId}`);
      toast.success('Post position deleted');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete post');
    }
  };

  const handleAddCandidate = async (e, postId) => {
    e.preventDefault();
    if (!candidateForm.name.trim()) { toast.error('Candidate name required'); return; }
    try {
      await api.post(`/admin/elections/${id}/posts/${postId}/candidates`, candidateForm);
      toast.success('Candidate registered successfully');
      setShowAddCandidate(null);
      setCandidateForm({ name: '', usn: '', class_name: '', description: '', display_order: 0 });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add candidate');
    }
  };

  const handleDeleteCandidate = async (postId, candidateId) => {
    if (!confirm('Remove this candidate from election ballot?')) return;
    try {
      await api.delete(`/admin/elections/${id}/posts/${postId}/candidates/${candidateId}`);
      toast.success('Candidate removed');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove candidate');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-surface-400 text-sm font-semibold">Loading Posts & Candidates...</p>
      </div>
    );
  }

  if (!election) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/elections')}
          className="p-2.5 rounded-xl bg-surface-900 border border-surface-800 text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{election.name}</h1>
            <span className="badge-info">{election.status}</span>
          </div>
          {election.description && <p className="text-surface-400 text-sm mt-0.5">{election.description}</p>}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <span className="stat-label">Position Posts</span>
          <div className="stat-value">{posts.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Candidates</span>
          <div className="stat-value text-indigo-300">
            {posts.reduce((acc, p) => acc + (p.candidates?.length || 0), 0)}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Eligible Voters</span>
          <div className="stat-value text-sky-300">{election.total_eligible_voters || 0}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ballots Cast</span>
          <div className="stat-value text-emerald-400">{election.votes_cast || 0}</div>
        </div>
      </div>

      {/* Posts Section Header */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="section-title">Election Positions & Candidates</h2>
        <button
          onClick={() => {
            setShowAddPost(true);
            setPostForm({ title: '', description: '', is_mandatory: true, display_order: posts.length });
          }}
          className="btn-primary flex items-center gap-2 py-2.5 px-5 text-xs font-bold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          <span>Add Position Post</span>
        </button>
      </div>

      {/* Modal Add Post */}
      {showAddPost && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowAddPost(false)}>
          <div className="glass-card p-8 w-full max-w-lg border border-surface-700/60 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-800">
              <h3 className="text-xl font-extrabold text-white">Add Position Post</h3>
              <button onClick={() => setShowAddPost(false)} className="text-surface-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleAddPost} className="space-y-4">
              <div>
                <label className="label-text">Post Title *</label>
                <input
                  className="input-field"
                  value={postForm.title}
                  onChange={e => setPostForm({ ...postForm, title: e.target.value })}
                  placeholder="e.g. Class President"
                  autoFocus
                />
              </div>

              <div>
                <label className="label-text">Post Role Description</label>
                <input
                  className="input-field"
                  value={postForm.description}
                  onChange={e => setPostForm({ ...postForm, description: e.target.value })}
                  placeholder="e.g. Lead representative for batch activities"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_mandatory"
                  checked={postForm.is_mandatory}
                  onChange={e => setPostForm({ ...postForm, is_mandatory: e.target.checked })}
                  className="w-4 h-4 rounded bg-surface-900 border-surface-700 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_mandatory" className="text-sm font-semibold text-surface-200 cursor-pointer">
                  Mandatory Selection (Voter must select candidate for this post)
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-surface-800">
                <button type="button" onClick={() => setShowAddPost(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary px-8">Save Position</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Candidate */}
      {showAddCandidate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowAddCandidate(null)}>
          <div className="glass-card p-8 w-full max-w-lg border border-surface-700/60 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-800">
              <h3 className="text-xl font-extrabold text-white">Register Candidate</h3>
              <button onClick={() => setShowAddCandidate(null)} className="text-surface-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={(e) => handleAddCandidate(e, showAddCandidate)} className="space-y-4">
              <div>
                <label className="label-text">Candidate Full Name *</label>
                <input
                  className="input-field"
                  value={candidateForm.name}
                  onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">USN / Roll No.</label>
                  <input
                    className="input-field font-mono uppercase"
                    value={candidateForm.usn}
                    onChange={e => setCandidateForm({ ...candidateForm, usn: e.target.value.toUpperCase() })}
                    placeholder="e.g. 1MS23CS042"
                  />
                </div>
                <div>
                  <label className="label-text">Class / Branch</label>
                  <input
                    className="input-field"
                    value={candidateForm.class_name}
                    onChange={e => setCandidateForm({ ...candidateForm, class_name: e.target.value })}
                    placeholder="e.g. CSE-A"
                  />
                </div>
              </div>

              <div>
                <label className="label-text">Manifesto / Agenda Summary</label>
                <textarea
                  className="input-field min-h-[80px] py-3 resize-none"
                  value={candidateForm.description}
                  onChange={e => setCandidateForm({ ...candidateForm, description: e.target.value })}
                  placeholder="Short statement displayed to voters during voting..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-surface-800">
                <button type="button" onClick={() => setShowAddCandidate(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary px-8">Add Candidate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts Cards Grid */}
      {posts.length === 0 ? (
        <div className="glass-card p-12 text-center text-surface-400">
          No position posts created yet. Click "Add Position Post" above to define roles.
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="glass-card p-6 border border-surface-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-800">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-extrabold text-white">{post.title}</h3>
                    {post.is_mandatory && <span className="badge-warning text-[10px]">Mandatory Post</span>}
                  </div>
                  {post.description && <p className="text-xs text-surface-400 mt-1">{post.description}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowAddCandidate(post.id);
                      setCandidateForm({ name: '', usn: '', class_name: '', description: '', display_order: post.candidates?.length || 0 });
                    }}
                    className="btn-secondary text-xs font-bold py-2 px-4 flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    <span>Register Candidate</span>
                  </button>

                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2 text-surface-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Delete Position Post"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>

              {/* Candidates Grid */}
              {post.candidates?.length === 0 ? (
                <div className="p-8 text-center bg-surface-950/40 rounded-2xl border border-dashed border-surface-800 text-surface-500 text-xs">
                  No candidates registered for this position yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {post.candidates.map((candidate) => (
                    <div key={candidate.id} className="p-4 rounded-2xl bg-surface-950/80 border border-surface-800 flex items-start justify-between gap-3 group hover:border-primary-500/40 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-base shadow-md flex-shrink-0">
                          {candidate.name[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base">{candidate.name}</h4>
                          {candidate.usn && <p className="font-mono text-xs text-primary-300 font-semibold">{candidate.usn}</p>}
                          {candidate.class_name && <p className="text-xs text-surface-400">{candidate.class_name}</p>}
                          {candidate.description && <p className="text-xs text-surface-400 mt-2 line-clamp-2 italic">"{candidate.description}"</p>}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteCandidate(post.id, candidate.id)}
                        className="p-1.5 text-surface-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Remove Candidate"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
