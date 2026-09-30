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
      toast.error('Failed to load election');
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
      toast.success('Post added');
      setShowAddPost(false);
      setPostForm({ title: '', description: '', is_mandatory: true, display_order: 0 });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add post');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post and all its candidates?')) return;
    try {
      await api.delete(`/admin/elections/${id}/posts/${postId}`);
      toast.success('Post deleted');
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
      toast.success('Candidate added');
      setShowAddCandidate(null);
      setCandidateForm({ name: '', usn: '', class_name: '', description: '', display_order: 0 });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add candidate');
    }
  };

  const handleDeleteCandidate = async (postId, candidateId) => {
    if (!confirm('Remove this candidate?')) return;
    try {
      await api.delete(`/admin/elections/${id}/posts/${postId}/candidates/${candidateId}`);
      toast.success('Candidate removed');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove candidate');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!election) return null;

  const isEditable = election.status === 'DRAFT' || election.status === 'SCHEDULED';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/elections')} className="p-2 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-surface-200 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="page-title">{election.name}</h1>
          <p className="text-sm text-surface-400 mt-0.5">{election.description || 'No description'}</p>
        </div>
      </div>

      {/* Election Info */}
      <div className="glass-card p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-surface-500 mb-1">Status</div>
            <span className={`badge-${election.status === 'OPEN' ? 'success' : election.status === 'CLOSED' ? 'danger' : 'neutral'}`}>
              {election.status}
            </span>
          </div>
          <div>
            <div className="text-xs text-surface-500 mb-1">Eligible Voters</div>
            <div className="font-semibold text-surface-200">{election.total_eligible_voters}</div>
          </div>
          <div>
            <div className="text-xs text-surface-500 mb-1">Votes Cast</div>
            <div className="font-semibold text-surface-200">{election.votes_cast}</div>
          </div>
          <div>
            <div className="text-xs text-surface-500 mb-1">Eligible Classes</div>
            <div className="font-semibold text-surface-200">
              {election.eligible_classes?.length > 0 ? election.eligible_classes.map(c => c.name).join(', ') : 'All'}
            </div>
          </div>
        </div>
      </div>

      {/* Posts & Candidates */}
      <div className="flex items-center justify-between">
        <h2 className="section-title">Posts & Candidates</h2>
        {isEditable && (
          <button onClick={() => setShowAddPost(true)} className="btn-primary text-sm">+ Add Post</button>
        )}
      </div>

      {/* Add Post Modal */}
      {showAddPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddPost(false)}>
          <div className="glass-card p-6 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-surface-100 mb-4">Add Post</h2>
            <form onSubmit={handleAddPost} className="space-y-4">
              <div>
                <label className="label-text">Post Title *</label>
                <input className="input-field" value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })} placeholder="e.g., Class Representative" autoFocus />
              </div>
              <div>
                <label className="label-text">Description</label>
                <textarea className="input-field min-h-[60px]" value={postForm.description} onChange={e => setPostForm({ ...postForm, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="mandatory" checked={postForm.is_mandatory} onChange={e => setPostForm({ ...postForm, is_mandatory: e.target.checked })} className="rounded" />
                <label htmlFor="mandatory" className="text-sm text-surface-300">Mandatory selection</label>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAddPost(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Post</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="glass-card p-8 text-center text-surface-400">
          No posts created yet. Add posts with candidates to configure the ballot.
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-surface-100">{post.title}</h3>
                  {post.description && <p className="text-sm text-surface-400 mt-0.5">{post.description}</p>}
                  <div className="flex gap-2 mt-1">
                    {post.is_mandatory && <span className="badge-info">Mandatory</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {isEditable && (
                    <>
                      <button onClick={() => { setShowAddCandidate(post.id); setCandidateForm({ name: '', usn: '', class_name: '', description: '', display_order: 0 }); }} className="btn-secondary text-xs !px-3 !py-1.5">+ Candidate</button>
                      <button onClick={() => handleDeletePost(post.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Add Candidate Modal */}
              {showAddCandidate === post.id && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddCandidate(null)}>
                  <div className="glass-card p-6 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                    <h2 className="text-lg font-bold text-surface-100 mb-4">Add Candidate to "{post.title}"</h2>
                    <form onSubmit={e => handleAddCandidate(e, post.id)} className="space-y-4">
                      <div>
                        <label className="label-text">Candidate Name *</label>
                        <input className="input-field" value={candidateForm.name} onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })} autoFocus />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label-text">USN</label>
                          <input className="input-field" value={candidateForm.usn} onChange={e => setCandidateForm({ ...candidateForm, usn: e.target.value })} />
                        </div>
                        <div>
                          <label className="label-text">Class</label>
                          <input className="input-field" value={candidateForm.class_name} onChange={e => setCandidateForm({ ...candidateForm, class_name: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label className="label-text">Description</label>
                        <textarea className="input-field min-h-[60px]" value={candidateForm.description} onChange={e => setCandidateForm({ ...candidateForm, description: e.target.value })} />
                      </div>
                      <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => setShowAddCandidate(null)} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">Add Candidate</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Candidates list */}
              {post.candidates?.length > 0 ? (
                <div className="space-y-2">
                  {post.candidates.map((candidate, ci) => (
                    <div key={candidate.id} className="flex items-center justify-between p-3 bg-surface-800/50 rounded-xl border border-surface-700/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400 font-semibold text-sm">
                          {ci + 1}
                        </div>
                        <div>
                          <p className="font-medium text-surface-200">{candidate.name}</p>
                          <p className="text-xs text-surface-500">
                            {[candidate.usn, candidate.class_name].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                      </div>
                      {isEditable && (
                        <button onClick={() => handleDeleteCandidate(post.id, candidate.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-surface-500 italic">No candidates added yet</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
