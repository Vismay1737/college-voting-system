import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api';

export default function VotingPage() {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const [ballot, setBallot] = useState(null);
  const [selections, setSelections] = useState({});
  const [step, setStep] = useState('vote'); // vote, review, confirm, success
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadBallot(); }, [electionId]);

  const loadBallot = async () => {
    try {
      const res = await api.get(`/voter/election/${electionId}/ballot`);
      setBallot(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load ballot');
      navigate('/voter/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (postId, candidateId) => {
    setSelections(prev => ({ ...prev, [postId]: candidateId }));
  };

  const handleReview = () => {
    // Validate mandatory posts
    if (!ballot) return;
    const mandatoryPosts = ballot.posts.filter(p => p.is_mandatory);
    const missing = mandatoryPosts.filter(p => !selections[p.id]);
    if (missing.length > 0) {
      toast.error(`Please select a candidate for: ${missing.map(p => p.title).join(', ')}`);
      return;
    }
    setStep('review');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const voteData = {
        election_id: parseInt(electionId),
        selections: Object.entries(selections).map(([postId, candidateId]) => ({
          post_id: parseInt(postId),
          candidate_id: parseInt(candidateId),
        })),
      };

      await api.post('/voter/vote', voteData);
      setStep('success');
      toast.success('Vote submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit vote');
      if (err.response?.status === 409) {
        setStep('success');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getCandidateName = (postId, candidateId) => {
    const post = ballot?.posts?.find(p => p.id === postId);
    const candidate = post?.candidates?.find(c => c.id === candidateId);
    return candidate?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ballot) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      {/* Header */}
      <header className="border-b border-surface-700/50 bg-surface-900/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 'vote' && (
              <button onClick={() => navigate('/voter/dashboard')} className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <span className="font-semibold text-surface-200 text-sm">{ballot.election.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {step === 'vote' && (
              <span className="text-xs text-surface-500">
                {Object.keys(selections).length} / {ballot.posts.length} selected
              </span>
            )}
            <a
              href="/admin/login"
              className="text-xs text-surface-500 hover:text-primary-400 transition-colors flex items-center gap-1"
              title="Admin Portal"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="hidden sm:inline">Admin</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* STEP: Vote Selection */}
        {step === 'vote' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-surface-100">Cast Your Vote</h1>
              <p className="text-sm text-surface-400 mt-1">Select one candidate for each position</p>
            </div>

            {ballot.posts.map((post, postIndex) => (
              <div key={post.id} className="glass-card p-5 animate-slide-up" style={{ animationDelay: `${postIndex * 75}ms` }}>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-bold text-surface-100 uppercase tracking-wide text-sm">{post.title}</h2>
                  {post.is_mandatory && <span className="text-red-400 text-xs">*</span>}
                </div>
                {post.description && <p className="text-xs text-surface-400 mb-3">{post.description}</p>}

                <div className="space-y-2">
                  {post.candidates.map((candidate) => {
                    const isSelected = selections[post.id] === candidate.id;
                    return (
                      <button
                        key={candidate.id}
                        onClick={() => handleSelect(post.id, candidate.id)}
                        className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-center gap-4 ${
                          isSelected
                            ? 'bg-primary-500/10 border-primary-500/40 shadow-lg shadow-primary-500/10'
                            : 'bg-surface-800/30 border-surface-700/30 hover:bg-surface-700/30 hover:border-surface-600/50'
                        }`}
                      >
                        {/* Radio circle */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? 'border-primary-400 bg-primary-500'
                            : 'border-surface-500'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 bg-white rounded-full animate-scale-in" />
                          )}
                        </div>

                        {/* Candidate avatar */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          isSelected
                            ? 'bg-primary-500/20 text-primary-400'
                            : 'bg-surface-700/50 text-surface-400'
                        }`}>
                          {candidate.name[0].toUpperCase()}
                        </div>

                        {/* Candidate info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-surface-200">{candidate.name}</div>
                          {(candidate.usn || candidate.class_name) && (
                            <div className="text-xs text-surface-500 mt-0.5">
                              {[candidate.usn, candidate.class_name].filter(Boolean).join(' • ')}
                            </div>
                          )}
                          {candidate.description && (
                            <div className="text-xs text-surface-400 mt-1 line-clamp-2">{candidate.description}</div>
                          )}
                        </div>

                        {isSelected && (
                          <svg className="w-5 h-5 text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              onClick={handleReview}
              className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold text-lg rounded-2xl
                       shadow-xl shadow-primary-500/25 hover:shadow-2xl hover:shadow-primary-500/30
                       active:scale-[0.98] transition-all duration-300"
            >
              Review Your Selections →
            </button>
          </div>
        )}

        {/* STEP: Review */}
        {step === 'review' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold text-surface-100">Review Your Selections</h1>
              <p className="text-sm text-surface-400 mt-1">Please verify your choices before submitting</p>
            </div>

            <div className="glass-card p-5 space-y-4">
              {ballot.posts.map((post) => {
                const selectedId = selections[post.id];
                if (!selectedId) return null;
                return (
                  <div key={post.id} className="flex items-center justify-between p-3 bg-surface-800/50 rounded-xl border border-surface-700/30">
                    <div>
                      <div className="text-xs text-surface-500 uppercase tracking-wide">{post.title}</div>
                      <div className="font-semibold text-surface-200 mt-0.5">{getCandidateName(post.id, selectedId)}</div>
                    </div>
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                );
              })}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
              <p className="text-amber-400 text-sm font-medium">⚠ Your vote cannot be changed after submission.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('vote')} className="btn-secondary flex-1 !py-3">
                ← Back
              </button>
              <button onClick={() => setStep('confirm')} className="btn-success flex-1 !py-3 font-bold">
                Confirm & Submit
              </button>
            </div>
          </div>
        )}

        {/* STEP: Final Confirmation Dialog */}
        {step === 'confirm' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card p-8 text-center">
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-amber-500/20">
                <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-surface-100 mb-2">Final Confirmation</h2>
              <p className="text-surface-400 mb-6">
                Your vote <span className="font-bold text-surface-200">cannot be changed</span> after submission.
                <br />Are you absolutely sure you want to submit?
              </p>

              <div className="flex gap-3">
                <button onClick={() => setStep('review')} className="btn-secondary flex-1 !py-3">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-xl
                           shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30
                           active:scale-[0.98] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : '🗳 SUBMIT VOTE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Success */}
        {step === 'success' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card p-10 text-center">
              <div className="w-24 h-24 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
                <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-accent-400 bg-clip-text text-transparent mb-3">
                Vote Submitted!
              </h2>
              <p className="text-surface-400 mb-2">Your vote has been securely recorded.</p>
              <p className="text-surface-500 text-sm">Thank you for participating in the election.</p>

              <div className="mt-8 p-4 bg-surface-800/50 rounded-xl border border-surface-700/30">
                <p className="text-xs text-surface-500">
                  🔒 Your selections have been stored anonymously.<br />
                  No one can link your identity to your ballot.
                </p>
              </div>

              <button
                onClick={() => navigate('/voter/dashboard')}
                className="btn-primary mt-6 w-full !py-3"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
