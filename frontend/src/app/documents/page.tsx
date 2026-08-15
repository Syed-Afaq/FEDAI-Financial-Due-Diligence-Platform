'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchDocuments, uploadDocument, getDocumentDownloadUrl, deleteDocument } from '@/lib/api';
import { DocumentItem } from '@/types';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      setError(null);
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load documents from backend.');
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setSuccess(null);
    setIsUploading(true);

    const allowed = ['.pdf', '.xlsx', '.xls', '.csv'];
    const uploadedCount = files.length;
    let successfulCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowed.includes(ext)) {
        setError(`File '${file.name}' has an unsupported extension (${ext}). Allowed: PDF, XLSX, XLS, CSV.`);
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        setError(`File '${file.name}' exceeds the 50MB size limit.`);
        continue;
      }

      setUploadProgress(`Uploading ${i + 1}/${uploadedCount}: ${file.name}...`);

      try {
        await uploadDocument(file, companyName.trim() || undefined);
        successfulCount++;
      } catch (err: any) {
        setError(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    setIsUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (successfulCount > 0) {
      setSuccess(`Successfully ingested ${successfulCount} document(s) into MinIO & database.`);
      await loadDocuments();
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    try {
      const { download_url } = await getDocumentDownloadUrl(doc.id);
      window.open(download_url, '_blank');
    } catch (err: any) {
      alert(`Could not generate download URL: ${err.message}`);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!confirm(`Are you sure you want to delete "${doc.original_filename}"?`)) return;
    try {
      await deleteDocument(doc.id);
      setSuccess(`Deleted ${doc.original_filename}`);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (err: any) {
      setError(`Failed to delete document: ${err.message}`);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? doc.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf': return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'xlsx':
      case 'xls': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'csv': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default: return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            PROCESSED
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
            INDEXING
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Financial Data Room & Document Vault</h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload balance sheets, income statements, 10-K/10-Q filings, Excel models, or data-room exports.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">Ingest Documents</h2>
            <p className="text-xs text-slate-400">Files are validated, encrypted, and saved to S3-compatible MinIO storage.</p>
          </div>
          <div className="w-full md:w-64">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Target Company / Entity
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp / TargetCo"
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Drag and Drop Container */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileUpload(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10 scale-[0.99]'
              : 'border-slate-700/80 hover:border-blue-500/50 hover:bg-slate-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {isUploading ? uploadProgress : 'Click to select or drag and drop financial documents here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supported formats: <span className="text-rose-400 font-mono">PDF</span>, <span className="text-emerald-400 font-mono">XLSX / XLS</span>, <span className="text-amber-400 font-mono">CSV</span> (Max 50MB per file)
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span>?? {error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white font-bold ml-2">?</button>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <span>? {success}</span>
            <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-white font-bold ml-2">?</button>
          </div>
        )}
      </div>

      {/* Documents Table */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white">Data Room Registry</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs font-mono text-slate-300">
              {filteredDocs.length} {filteredDocs.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search documents..."
              className="w-full sm:w-48 px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
            </select>
            <button
              onClick={loadDocuments}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              ?
            </button>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-2">Document Name</th>
                <th className="pb-3 px-2">Entity</th>
                <th className="pb-3 px-2">Format</th>
                <th className="pb-3 px-2">Size</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2">Uploaded At</th>
                <th className="pb-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No documents found. Drag & drop files above to start due-diligence ingestion.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-2 font-medium text-white max-w-xs truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">??</span>
                        <span title={doc.original_filename}>{doc.original_filename}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-medium text-slate-300">
                        {doc.company_name}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${getBadgeColor(doc.file_type)}`}>
                        .{doc.file_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-mono text-slate-400">
                      {formatBytes(doc.file_size)}
                    </td>
                    <td className="py-3 px-2">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="py-3 px-2 text-slate-400 font-mono">
                      {new Date(doc.uploaded_at).toLocaleDateString()} {new Date(doc.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold transition-colors"
                          title="Generate Presigned S3 Download URL"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="px-2 py-1 rounded bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 text-xs font-semibold transition-colors"
                          title="Delete Document"
                        >
                          ?
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
    </div>
  );
}