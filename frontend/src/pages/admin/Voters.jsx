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
      toast.success(`${res.data.imported_count} voters imported!`);
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
    if (!confirm('Reset this voter\'s password? The old password will be invalidated immediately.')) return;
    try {
      const res = await api.post(`/admin/voters/${voterId}/reset-password`);
      setResetResult(res.data);
      toast.success('Password reset');
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
    toast.success('Credentials exported');
  };

  const closeUploadModal = () => {
    setShowUpload(false);
    setUploadStep('upload');
    setPreviewData(null);
    setValidationResult(null);
    setCredentials(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="page-title">Voters</h1>
        <button onClick={() => setShowUpload(true)} className="btn-primary">📊 Import from Excel</button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <input
          className="input-field flex-1"
          placeholder="Search by USN or Name..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="input-field !w-auto" value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(1); }}>
          <option value="">All Classes</option>
          {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
        </select>
        <select className="input-field !w-auto" value={filterVoted} onChange={e => { setFilterVoted(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="true">Voted</option>
          <option value="false">Not Voted</option>
        </select>
      </div>

      <p className="text-sm text-surface-400">{totalCount} voter{totalCount !== 1 ? 's' : ''} found</p>

      {/* Voters Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>USN</th>
              <th>Name</th>
              <th>Class</th>
              <th>Status</th>
              <th>Voted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {voters.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-surface-500">No voters found</td></tr>
            ) : (
              voters.map((voter) => (
                <tr key={voter.id}>
                  <td className="font-mono text-sm text-surface-200">{voter.usn}</td>
                  <td className="text-surface-300">{voter.name || '—'}</td>
                  <td className="text-surface-400">{voter.class_name || '—'}</td>
                  <td>
                    <span className={voter.is_active ? 'badge-success' : 'badge-danger'}>
                      {voter.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <span className={voter.has_voted ? 'badge-success' : 'badge-neutral'}>
                      {voter.has_voted ? '✓ Voted' : 'Not Voted'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleToggleActive(voter.id)}
                        className="px-2 py-1 text-xs rounded-lg bg-surface-700/50 text-surface-300 hover:bg-surface-600/50 transition-colors"
                        title={voter.is_active ? 'Disable' : 'Enable'}
                      >
                        {voter.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleResetPassword(voter.id)}
                        className="px-2 py-1 text-xs rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                      >
                        Reset PW
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 50 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm !px-3 !py-1.5">← Prev</button>
          <span className="px-4 py-1.5 text-sm text-surface-400">Page {page} of {Math.ceil(totalCount / 50)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 50 >= totalCount} className="btn-secondary text-sm !px-3 !py-1.5">Next →</button>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setResetResult(null)}>
          <div className="glass-card p-6 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-surface-100 mb-4">✓ Password Reset Successfully</h2>
            <div className="bg-surface-800/80 rounded-xl p-4 space-y-2">
              <div><span className="text-surface-400 text-sm">USN:</span> <span className="font-mono text-surface-200">{resetResult.usn}</span></div>
              <div><span className="text-surface-400 text-sm">New Password:</span> <span className="font-mono text-lg font-bold text-emerald-400">{resetResult.new_password}</span></div>
            </div>
            <p className="text-xs text-amber-400 mt-3">⚠ This password will not be shown again</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { navigator.clipboard.writeText(resetResult.new_password); toast.success('Copied!'); }} className="btn-secondary flex-1">Copy</button>
              <button onClick={() => setResetResult(null)} className="btn-primary flex-1">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeUploadModal}>
          <div className="glass-card p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>

            {/* Step: Upload */}
            {uploadStep === 'upload' && (
              <div>
                <h2 className="text-xl font-bold text-surface-100 mb-4">📊 Import Voters from Excel</h2>
                <div
                  className="border-2 border-dashed border-surface-600/50 rounded-2xl p-12 text-center hover:border-primary-500/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-surface-200 font-medium">Click to upload or drag and drop</p>
                  <p className="text-surface-500 text-sm mt-1">Supports .xlsx files with USN, Name, and Class columns</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                <button onClick={closeUploadModal} className="btn-secondary mt-4 w-full">Cancel</button>
              </div>
            )}

            {/* Step: Preview & Column Mapping */}
            {uploadStep === 'preview' && previewData && (
              <div>
                <h2 className="text-xl font-bold text-surface-100 mb-4">Column Mapping</h2>
                <p className="text-surface-400 text-sm mb-4">{previewData.total_rows} rows found. Map the columns:</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <div>
                    <label className="label-text">USN Column *</label>
                    <select className="input-field" value={mapping.usn_column} onChange={e => setMapping({ ...mapping, usn_column: e.target.value })}>
                      <option value="">Select...</option>
                      {previewData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Name Column</label>
                    <select className="input-field" value={mapping.name_column} onChange={e => setMapping({ ...mapping, name_column: e.target.value })}>
                      <option value="">None</option>
                      {previewData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Class Column</label>
                    <select className="input-field" value={mapping.class_column} onChange={e => setMapping({ ...mapping, class_column: e.target.value })}>
                      <option value="">None</option>
                      {previewData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <div className="section-title mb-2">Preview (first 10 rows)</div>
                <div className="table-container mb-4">
                  <table>
                    <thead><tr>{previewData.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {previewData.sample_rows.map((row, i) => (
                        <tr key={i}>{previewData.headers.map(h => <td key={h} className="text-sm">{row[h] || ''}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={closeUploadModal} className="btn-secondary">Cancel</button>
                  <button onClick={handleValidate} className="btn-primary">Validate</button>
                </div>
              </div>
            )}

            {/* Step: Validation */}
            {uploadStep === 'validate' && validationResult && (
              <div>
                <h2 className="text-xl font-bold text-surface-100 mb-4">Import Preview</h2>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                  <div className="stat-card !p-3">
                    <div className="text-2xl font-bold text-surface-200">{validationResult.summary.total_rows}</div>
                    <div className="text-xs text-surface-500">Total Rows</div>
                  </div>
                  <div className="stat-card !p-3">
                    <div className="text-2xl font-bold text-emerald-400">{validationResult.summary.valid_count}</div>
                    <div className="text-xs text-surface-500">Valid</div>
                  </div>
                  <div className="stat-card !p-3">
                    <div className="text-2xl font-bold text-amber-400">{validationResult.summary.duplicate_count}</div>
                    <div className="text-xs text-surface-500">Duplicates</div>
                  </div>
                  <div className="stat-card !p-3">
                    <div className="text-2xl font-bold text-red-400">{validationResult.summary.invalid_count}</div>
                    <div className="text-xs text-surface-500">Invalid</div>
                  </div>
                  <div className="stat-card !p-3">
                    <div className="text-2xl font-bold text-blue-400">{validationResult.summary.existing_count}</div>
                    <div className="text-xs text-surface-500">Existing</div>
                  </div>
                </div>

                {/* Show errors */}
                {validationResult.duplicates.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-amber-400 mb-1">Duplicate USNs ({validationResult.duplicates.length})</div>
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 max-h-32 overflow-y-auto text-xs">
                      {validationResult.duplicates.map((d, i) => <div key={i}>Row {d.row}: {d.usn} — {d.reason}</div>)}
                    </div>
                  </div>
                )}
                {validationResult.invalid.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-red-400 mb-1">Invalid ({validationResult.invalid.length})</div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 max-h-32 overflow-y-auto text-xs">
                      {validationResult.invalid.map((d, i) => <div key={i}>Row {d.row}: {d.usn || '(empty)'} — {d.reason}</div>)}
                    </div>
                  </div>
                )}
                {validationResult.existing.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-blue-400 mb-1">Already Registered ({validationResult.existing.length})</div>
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 max-h-32 overflow-y-auto text-xs">
                      {validationResult.existing.map((d, i) => <div key={i}>Row {d.row}: {d.usn} — {d.reason}</div>)}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-end mt-4">
                  <button onClick={closeUploadModal} className="btn-secondary">Cancel</button>
                  <button onClick={handleConfirmImport} disabled={validationResult.summary.valid_count === 0 || importing} className="btn-success">
                    {importing ? 'Importing...' : `Import ${validationResult.summary.valid_count} Valid Students`}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Credentials */}
            {uploadStep === 'credentials' && credentials && (
              <div>
                <h2 className="text-xl font-bold text-surface-100 mb-2">✓ Import Complete</h2>
                <p className="text-surface-400 text-sm mb-4">{credentials.imported_count} voters imported. Save these credentials now — they cannot be retrieved later.</p>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                  <p className="text-amber-400 text-sm font-medium">⚠ These passwords will NOT be shown again. Copy, print, or export them now.</p>
                </div>

                <div className="flex flex-wrap gap-2 mb-4 no-print">
                  <button onClick={copyCredentials} className="btn-secondary text-sm">📋 Copy</button>
                  <button onClick={printCredentials} className="btn-secondary text-sm">🖨 Print</button>
                  <button onClick={exportCredentialsExcel} className="btn-secondary text-sm">📥 Export CSV</button>
                </div>

                <div className="table-container max-h-96 overflow-y-auto">
                  <table>
                    <thead><tr><th>Name</th><th>USN</th><th>Class</th><th>Password</th></tr></thead>
                    <tbody>
                      {credentials.credentials.map((c, i) => (
                        <tr key={i}>
                          <td className="text-surface-300">{c.name || '—'}</td>
                          <td className="font-mono text-sm text-surface-200">{c.usn}</td>
                          <td className="text-surface-400">{c.class_name || '—'}</td>
                          <td className="font-mono font-bold text-emerald-400">{c.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button onClick={closeUploadModal} className="btn-primary mt-4 w-full">Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
