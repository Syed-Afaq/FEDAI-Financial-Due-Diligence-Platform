'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchHealth, fetchDocuments } from '@/lib/api';
import { DocumentItem, HealthResponse } from '@/types';

export default function OverviewPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [h, docs] = await Promise.allSettled([
          fetchHealth(),
          fetchDocuments(),
        ]);
        if (h.status === 'fulfilled') setHealth(h.value);
        if (docs.status === 'fulfilled') setDocuments(docs.value);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Banner */}
      <div className="glass-panel rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
            <span>? Phase 3 Active</span>
            <span>•</span>
            <span>Document Ingestion Pipeline</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Evidence-Grounded Financial Due Diligence
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Upload audited financials, investor decks, P&L spreadsheets, and data room documents. FEDAI extracts verified statements, detects financial risks, and answers due-diligence inquiries with exact citations.
          </p>
          <div className="pt-2 flex items-center gap-4">
            <Link
              href="/documents"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Data Room
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              FastAPI Swagger Docs ?
            </a>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingested Documents</div>
          <div className="text-3xl font-bold text-white">
            {loading ? '...' : documents.length}
          </div>
          <p className="text-xs text-slate-400">PDFs, CSVs, and Excel spreadsheets in MinIO</p>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-6 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Core Engine</div>
          <div className="text-3xl font-bold text-emerald-400 flex items-center gap-2">
            {health?.status === 'ok' ? 'Online' : (loading ? 'Checking...' : 'Standby')}
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          </div>
          <p className="text-xs text-slate-400">FastAPI backend & PostgreSQL connection</p>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-6 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Storage Target</div>
          <div className="text-3xl font-bold text-cyan-400">MinIO (S3)</div>
          <p className="text-xs text-slate-400">Bucket: <code className="font-mono text-cyan-300">fedai-documents</code></p>
        </div>
      </div>

      {/* Workflow Phase Map */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">System Due-Diligence Pipeline</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/40 space-y-2">
            <span className="text-xs font-bold text-blue-400 font-mono">STEP 1 • PHASE 3</span>
            <h4 className="text-sm font-semibold text-white">Document Ingestion</h4>
            <p className="text-xs text-slate-300">Stream PDFs, XLSX, and CSVs to MinIO and register in Postgres database.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2 opacity-75">
            <span className="text-xs font-bold text-slate-500 font-mono">STEP 2 • PHASE 4-6</span>
            <h4 className="text-sm font-semibold text-slate-300">Extraction & RAG</h4>
            <p className="text-xs text-slate-400">Deterministic financial extraction & chunk embedding indexing in Qdrant.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2 opacity-75">
            <span className="text-xs font-bold text-slate-500 font-mono">STEP 3 • PHASE 7-8</span>
            <h4 className="text-sm font-semibold text-slate-300">Financial & Risk Analysis</h4>
            <p className="text-xs text-slate-400">Deterministic ratio calculations, anomalies, and risk matrix scoring.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2 opacity-75">
            <span className="text-xs font-bold text-slate-500 font-mono">STEP 4 • PHASE 11</span>
            <h4 className="text-sm font-semibold text-slate-300">Audit Dossier</h4>
            <p className="text-xs text-slate-400">Generate verified PDF & Markdown due-diligence report with citations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}