import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../api';

export default function Voters() {
  const [voters, setVoters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterVoted, setFilterVoted] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  // Import states
  const [showUpload, setShowUpload] = useState(false);
  const [uploadStep, setUploadStep] = useState('upload'); // upload, preview, validate, credentials
  const [previewData, setPreviewData] = useState(null);
  const [mapping, setMapping] = useState({ usn_column: '', name_column: '', class_column: '' });
  const [validationResult, setValidationResult] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [importing, setImporting] = useState(false);

  // Password reset
  const [resetResult, setResetResult] = useState(null);

  const fileInputRef = useRef();

  useEffect(() => { loadVoters(); loadClasses(); }, [search, filterClass, filterVoted, page]);

  const loadVoters = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterClass) params.append('class_id', filterClass);
      if (filterVoted !== '') params.append('has_voted', filterVoted);
      params.append('page', page);
      params.append('page_size', 50);

      const [votersRes, countRes] = await Promise.all([
        api.get(`/admin/voters/?${params}`),
        api.get(`/admin/voters/count?${params}`),
      ]);
      setVoters(votersRes.data);
      setTotalCount(countRes.data.count);
    } catch (err) {
      toast.error('Failed to load voters');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const res = await api.get('/admin/classes/');
      setClasses(res.data);
    } catch (err) { /* silent */ }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/voters/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewData(res.data);
      setMapping({
        usn_column: res.data.detected_mapping.usn || res.data.headers[0] || '',
        name_column: res.data.detected_mapping.name || '',
        class_column: res.data.detected_mapping.class || '',
      });
      setUploadStep('preview');
      toast.success(`File uploaded: ${res.data.total_rows} rows found`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload file');
    }
    e.target.value = '';
  };

  const handleValidate = async () => {
    if (!mapping.usn_column) { toast.error('USN column is required'); return; }
    try {
      const res = await api.post('/admin/voters/validate-import', mapping);
      setValidationResult(res.data);
      setUploadStep('validate');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Validation failed');
    }
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    try {
      const res = await api.post('/admin/voters/confirm-import', mapping);
      setCredentials(res.data);
      setUploadStep('credentials');
      toast.success(`${res.data.imported_count} voters imported successfully!`);
      loadVoters();
      loadClasses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleToggleActive = async (voterId) => {
    try {
      await api.put(`/admin/voters/${voterId}/toggle-active`);
      toast.success('Voter status updated');
      loadVoters();
    } catch (err) {
      toast.error('Failed to update voter');
    }
  };

  const handleResetPassword = async (voterId) => {
    if (!confirm('Reset this voter\'s password? A new random voting password will be generated.')) return;
    try {
      const res = await api.post(`/admin/voters/${voterId}/reset-password`);
      setResetResult(res.data);
      toast.success('Password reset successfully');
    } catch (err) {
      toast.error('Failed to reset password');
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    const text = credentials.credentials.map(c =>
      `${c.name || 'N/A'}\t${c.usn}\t${c.password}`
    ).join('\n');
    navigator.clipboard.writeText(`Name\tUSN\tPassword\n${text}`);
    toast.success('Credentials copied to clipboard');
  };

  const printCredentials = () => {
    const printWindow = window.open('', '_blank');
    const rows = credentials.credentials.map(c =>
      `<tr><td style="padding:8px;border:1px solid #ddd">${c.name || 'N/A'}</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace">${c.usn}</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace;font-weight:bold">${c.password}</td></tr>`
    ).join('');
    printWindow.document.write(`
      <html><head><title>Voter Credentials</title></head>
      <body style="font-family:Arial,sans-serif;padding:20px">
        <h1 style="text-align:center">CLASS ELECTION 2026 — VOTER CREDENTIALS</h1>
        <p style="text-align:center;color:#666">Confidential — Distribute to individual students only</p>
        <table style="width:100%;border-collapse:collapse;margin-top:20px">
          <thead><tr style="background:#f5f5f5">
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Name</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">USN</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Password</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:20px;color:#999;font-size:12px">Generated: ${new Date().toLocaleString()}</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const exportCredentialsExcel = () => {
    if (!credentials) return;
    let csvContent = "Name,USN,Class,Password\n";
    credentials.credentials.forEach(c => {
      csvContent += `"${c.name || ''}","${c.usn}","${c.class_name || ''}","${c.password}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voter_credentials_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Credentials exported as CSV');
  };

  const closeUploadModal = () => {
    setShowUpload(false);
    setUploadStep('upload');
    setPreviewData(null);
    setValidationResult(null);
    setCredentials(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-surface-400 text-sm font-semibold">Loading Student Voter Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Voter Management</span>
          </h1>
          <p className="text-surface-400 text-sm mt-1">Manage student accounts, credentials, and Excel bulk imports.</p>
        </div>

        <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center justify-center gap-2 py-3 px-6 shadow-xl shadow-primary-500/25">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Bulk Import Voters (Excel)</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            className="input-field pl-11"
            placeholder="Search voters by USN or Name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
          <select className="input-field !w-auto" value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(1); }}>
            <option value="">All Classes & Branches</option>
            {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
          </select>

          <select className="input-field !w-auto" value={filterVoted} onChange={e => { setFilterVoted(e.target.value); setPage(1); }}>
            <option value="">All Voting Status</option>
            <option value="true">✓ Voted</option>
            <option value="false">⏳ Not Voted</option>
          </select>
        </div>
      </div>

      {/* Voters Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-bold text-surface-400 uppercase tracking-wider">
            Showing {voters.length} of {totalCount} Registered Voters
          </span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Student USN</th>
                <th>Full Name</th>
                <th>Class / Branch</th>
                <th>Account Status</th>
                <th>Voting Status</th>
                <th className="text-right">Manage Actions</th>
              </tr>
            </thead>
            <tbody>
              {voters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-surface-400">
                    No voters found matching current filter parameters.
                  </td>
                </tr>
              ) : (
                voters.map((voter) => (
                  <tr key={voter.id}>
                    <td className="font-mono text-sm font-bold text-primary-300">{voter.usn}</td>
                    <td className="text-white font-semibold">{voter.name || '—'}</td>
                    <td className="text-surface-300">{voter.class_name || '—'}</td>
                    <td>
                      <span className={voter.is_active ? 'badge-success' : 'badge-danger'}>
                        {voter.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <span className={voter.has_voted ? 'badge-success' : 'badge-neutral'}>
                        {voter.has_voted ? '✓ Voted' : 'Pending'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(voter.id)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors ${
                            voter.is_active
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          {voter.is_active ? 'Disable Account' : 'Enable Account'}
                        </button>
                        <button
                          onClick={() => handleResetPassword(voter.id)}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z" />
                          </svg>
                          <span>Reset Password</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalCount > 50 && (
        <div className="flex items-center justify-between glass-card p-4">
          <span className="text-xs text-surface-400 font-semibold">
            Page {page} of {Math.ceil(totalCount / 50)}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-xs !px-4 !py-2"
            >
              ← Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 50 >= totalCount}
              className="btn-secondary text-xs !px-4 !py-2"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Password Reset Result Modal */}
      {resetResult && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setResetResult(null)}>
          <div className="glass-card p-8 w-full max-w-md border border-amber-500/30 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z" />
              </svg>
            </div>

            <h2 className="text-xl font-extrabold text-white mb-2">New Password Generated</h2>
            <p className="text-surface-400 text-xs mb-4">Please note down this voting password and deliver it to the student.</p>

            <div className="bg-surface-950 p-4 rounded-xl border border-surface-800 space-y-2 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-surface-400 font-semibold">Student USN:</span>
                <span className="font-mono text-primary-300 font-bold">{resetResult.usn}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-surface-800">
                <span className="text-surface-400 font-semibold">New Voting Pass:</span>
                <span className="font-mono text-lg font-extrabold text-emerald-400">{resetResult.new_password}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { navigator.clipboard.writeText(resetResult.new_password); toast.success('Password copied'); }}
                className="btn-secondary flex-1 text-xs"
              >
                Copy Password
              </button>
              <button onClick={() => setResetResult(null)} className="btn-primary flex-1 text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Multi-Step Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={closeUploadModal}>
          <div className="glass-card p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-surface-700/60 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>

            {/* Step 1: File Upload */}
            {uploadStep === 'upload' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-surface-800">
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Import Student Voters (Excel)</span>
                  </h2>
                  <button onClick={closeUploadModal} className="text-surface-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div
                  className="border-2 border-dashed border-surface-700 hover:border-primary-500 rounded-3xl p-12 text-center bg-surface-950/50 hover:bg-primary-500/5 transition-all cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/20 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-white font-bold text-base">Click to select or drop Excel File (.xlsx)</p>
                  <p className="text-surface-400 text-xs mt-1">Excel file must contain student USN, Full Name, and Class columns.</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />

                <div className="flex justify-end pt-4 border-t border-surface-800">
                  <button onClick={closeUploadModal} className="btn-secondary">Cancel</button>
                </div>
              </div>
            )}

            {/* Step 2: Column Mapping */}
            {uploadStep === 'preview' && previewData && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-surface-800">
                  <h2 className="text-xl font-extrabold text-white">Map Excel Columns</h2>
                  <span className="text-xs font-bold text-primary-400">{previewData.total_rows} Total Rows Found</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-surface-950 rounded-2xl border border-surface-800">
                  <div>
                    <label className="label-text">USN Column *</label>
                    <select className="input-field" value={mapping.usn_column} onChange={e => setMapping({ ...mapping, usn_column: e.target.value })}>
                      <option value="">Select Column...</option>
                      {previewData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Student Name Column</label>
                    <select className="input-field" value={mapping.name_column} onChange={e => setMapping({ ...mapping, name_column: e.target.value })}>
                      <option value="">None</option>
                      {previewData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Class / Branch Column</label>
                    <select className="input-field" value={mapping.class_column} onChange={e => setMapping({ ...mapping, class_column: e.target.value })}>
                      <option value="">None</option>
                      {previewData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <div className="table-container max-h-64 overflow-y-auto">
                  <table>
                    <thead><tr>{previewData.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {previewData.sample_rows.map((row, i) => (
                        <tr key={i}>{previewData.headers.map(h => <td key={h} className="text-xs">{row[h] || ''}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-surface-800">
                  <button onClick={closeUploadModal} className="btn-secondary">Cancel</button>
                  <button onClick={handleValidate} className="btn-primary px-8">Validate Data</button>
                </div>
              </div>
            )}

            {/* Step 3: Validation */}
            {uploadStep === 'validate' && validationResult && (
              <div className="space-y-6">
                <h2 className="text-xl font-extrabold text-white">Validation Results</h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 text-center">
                    <div className="text-2xl font-extrabold text-white">{validationResult.summary.total_rows}</div>
                    <div className="text-[10px] uppercase font-bold text-surface-400">Total Rows</div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-950 border border-emerald-500/30 text-center">
                    <div className="text-2xl font-extrabold text-emerald-400">{validationResult.summary.valid_count}</div>
                    <div className="text-[10px] uppercase font-bold text-emerald-400">Valid to Import</div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-950 border border-amber-500/30 text-center">
                    <div className="text-2xl font-extrabold text-amber-400">{validationResult.summary.duplicate_count}</div>
                    <div className="text-[10px] uppercase font-bold text-amber-400">Duplicates</div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-950 border border-rose-500/30 text-center">
                    <div className="text-2xl font-extrabold text-rose-400">{validationResult.summary.invalid_count}</div>
                    <div className="text-[10px] uppercase font-bold text-rose-400">Invalid</div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-surface-800">
                  <button onClick={closeUploadModal} className="btn-secondary">Cancel</button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={validationResult.summary.valid_count === 0 || importing}
                    className="btn-success px-8"
                  >
                    {importing ? 'Importing Voters...' : `Confirm & Create ${validationResult.summary.valid_count} Voters`}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Credentials Output */}
            {uploadStep === 'credentials' && credentials && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Import Complete!</h2>
                    <p className="text-xs text-surface-400">{credentials.imported_count} voter accounts generated with secret credentials.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button onClick={copyCredentials} className="btn-secondary text-xs flex items-center gap-1.5">
                    <span>📋 Copy Credentials</span>
                  </button>
                  <button onClick={printCredentials} className="btn-secondary text-xs flex items-center gap-1.5">
                    <span>🖨 Print Credentials</span>
                  </button>
                  <button onClick={exportCredentialsExcel} className="btn-secondary text-xs flex items-center gap-1.5">
                    <span>📥 Export CSV File</span>
                  </button>
                </div>

                <div className="table-container max-h-80 overflow-y-auto">
                  <table>
                    <thead><tr><th>Student Name</th><th>USN</th><th>Class</th><th>Generated Password</th></tr></thead>
                    <tbody>
                      {credentials.credentials.map((c, i) => (
                        <tr key={i}>
                          <td className="text-white font-semibold">{c.name || '—'}</td>
                          <td className="font-mono text-sm text-primary-300 font-bold">{c.usn}</td>
                          <td className="text-surface-300">{c.class_name || '—'}</td>
                          <td className="font-mono font-extrabold text-emerald-400 text-sm">{c.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 border-t border-surface-800">
                  <button onClick={closeUploadModal} className="btn-primary w-full py-3">Finish & Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
