import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-surface-400 text-sm font-semibold">Preparing Cryptographic Ballot...</p>
      </div>
    );
  }

  if (!ballot) return null;

  return (
    <div className="min-h-screen bg-[#030712] mesh-grid text-surface-100 font-sans relative pb-12">
      {/* Top Navbar */}
      <header className="border-b border-surface-800/80 bg-surface-950/80 backdrop-blur-2xl sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 'vote' && (
              <button onClick={() => navigate('/voter/dashboard')} className="p-2 rounded-xl bg-surface-900 border border-surface-800 text-surface-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">{ballot.election.name}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Electronic Ballot</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {step === 'vote' && (
              <span className="text-xs font-bold text-emerald-300 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {Object.keys(selections).length} of {ballot.posts.length} Roles Selected
              </span>
            )}

            <Link
              to="/admin/login"
              className="text-xs text-surface-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-900 border border-surface-800"
            >
              <svg className="w-3.5 h-3.5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-8 relative z-10">

        {/* STEP: Vote Selection */}
        {step === 'vote' && (
          <div className="space-y-8 animate-fade-in">
            <div className="glass-card p-6 bg-gradient-to-r from-surface-950 via-teal-950/20 to-surface-950 border border-emerald-500/20 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Official Electronic Voting Booth</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Select Candidates</h1>
              <p className="text-surface-300 text-sm mt-1">Touch or click on a candidate option to select your vote for each post position.</p>
            </div>

            {ballot.posts.map((post, postIndex) => (
              <div key={post.id} className="glass-card p-8 border border-surface-800 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-surface-800">
                  <div>
                    <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                      <span>{post.title}</span>
                      {post.is_mandatory && <span className="text-rose-400 text-xs font-bold uppercase tracking-wider">* Mandatory</span>}
                    </h2>
                    {post.description && <p className="text-xs text-surface-400 mt-1">{post.description}</p>}
                  </div>

                  {selections[post.id] && (
                    <span className="badge-success text-xs">✓ Selected</span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {post.candidates.map((candidate) => {
                    const isSelected = selections[post.id] === candidate.id;
                    return (
                      <div
                        key={candidate.id}
                        onClick={() => handleSelect(post.id, candidate.id)}
                        className={`p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
                          isSelected
                            ? 'bg-gradient-to-r from-emerald-500/15 via-surface-950 to-surface-950 border-emerald-500 shadow-xl shadow-emerald-500/10 scale-[1.01]'
                            : 'bg-surface-950/80 border-surface-800 hover:border-surface-700 hover:bg-surface-900/40'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? 'border-emerald-400 bg-emerald-500' : 'border-surface-600'
                          }`}>
                            {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full animate-scale-in" />}
                          </div>

                          <div className={`w-12 h-12 rounded-xl font-extrabold flex items-center justify-center text-lg flex-shrink-0 ${
                            isSelected ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md' : 'bg-surface-800 text-surface-300'
                          }`}>
                            {candidate.name[0].toUpperCase()}
                          </div>

                          <div>
                            <h3 className="font-extrabold text-white text-lg">{candidate.name}</h3>
                            {(candidate.usn || candidate.class_name) && (
                              <p className="text-xs font-mono text-emerald-400 mt-0.5">
                                {[candidate.usn, candidate.class_name].filter(Boolean).join(' • ')}
                              </p>
                            )}
                            {candidate.description && (
                              <p className="text-xs text-surface-400 mt-1 italic">"{candidate.description}"</p>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              onClick={handleReview}
              className="btn-success w-full py-5 text-xl font-extrabold tracking-wide shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50"
            >
              PROCEED TO REVIEW BALLOT →
            </button>
          </div>
        )}

        {/* STEP: Review */}
        {step === 'review' && (
          <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Confirmation Summary</span>
              <h1 className="text-3xl font-extrabold text-white mt-1">Review Your Selections</h1>
              <p className="text-surface-400 text-sm mt-1">Check your chosen candidates before submitting into the encrypted ballot box.</p>
            </div>

            <div className="glass-card p-6 border border-surface-800 space-y-4">
              {ballot.posts.map((post) => {
                const selectedId = selections[post.id];
                if (!selectedId) return null;
                return (
                  <div key={post.id} className="p-4 rounded-xl bg-surface-950 border border-surface-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-surface-400">{post.title}</span>
                      <p className="text-lg font-extrabold text-white mt-0.5">{getCandidateName(post.id, selectedId)}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
              <p className="text-amber-400 text-xs font-bold uppercase tracking-wider">⚠ Important Notice</p>
              <p className="text-surface-300 text-xs mt-1">Once submitted, your vote is recorded permanently and cannot be undone or re-voted.</p>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep('vote')} className="btn-secondary flex-1 py-4 font-bold text-base">
                ← Edit Selections
              </button>
              <button onClick={() => setStep('confirm')} className="btn-success flex-1 py-4 font-bold text-base">
                Confirm & Submit
              </button>
            </div>
          </div>
        )}

        {/* STEP: Final Confirmation */}
        {step === 'confirm' && (
          <div className="space-y-8 animate-fade-in max-w-xl mx-auto">
            <div className="glass-card p-10 text-center border border-amber-500/30 shadow-2xl">
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
                <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-2">Final Confirmation Required</h2>
              <p className="text-surface-400 text-sm mb-8">
                Confirming will lock and deposit your ballot into the election database.
              </p>

              <div className="flex gap-4">
                <button onClick={() => setStep('review')} className="btn-secondary flex-1 py-3.5 font-bold">
                  Go Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-success flex-1 py-3.5 font-extrabold shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Recording Ballot...</span>
                    </>
                  ) : '📥 DEPOSIT BALLOT NOW'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Success Confirmation */}
        {step === 'success' && (
          <div className="space-y-8 animate-fade-in max-w-xl mx-auto">
            <div className="glass-card p-12 text-center border border-emerald-500/30 shadow-2xl">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 shadow-xl shadow-emerald-500/20">
                <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Vote Recorded Successfully!</h2>
              <p className="text-surface-300 text-sm max-w-sm mx-auto mb-6">
                Your vote has been cryptographically sealed and counted in the database.
              </p>

              <div className="p-4 bg-surface-950 rounded-2xl border border-surface-800 text-xs text-surface-400 mb-8 space-y-1">
                <p className="font-bold text-emerald-400">🔒 Secret Ballot Encryption</p>
                <p>All stored vote receipts are completely decoupled from student personal data.</p>
              </div>

              <button
                onClick={() => navigate('/voter/dashboard')}
                className="btn-primary w-full py-4 text-base font-extrabold"
              >
                Return to Voter Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
