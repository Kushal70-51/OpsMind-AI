import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, FileText, Search, Trash2, CheckCircle2, Loader2, AlertCircle, Layers, Cpu, Database } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

type Stage = 'chunking' | 'embedding' | 'indexing' | 'done' | 'error';

interface Doc {
  filename: string;
  uploadedAt: string | null;
  chunkCount: number;
  version: number;
  stage: Stage;
  errorReason?: string;
}

const STAGE_CONFIG: Record<Stage, { label: string; icon: React.ReactNode; className: string }> = {
  chunking:  { label: 'Chunking',  icon: <Layers className="w-3.5 h-3.5" />,              className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  embedding: { label: 'Embedding', icon: <Cpu className="w-3.5 h-3.5" />,                 className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  indexing:  { label: 'Indexing',  icon: <Database className="w-3.5 h-3.5" />,            className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  done:      { label: 'Ready',     icon: <CheckCircle2 className="w-3.5 h-3.5" />,        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  error:     { label: 'Error',     icon: <AlertCircle className="w-3.5 h-3.5" />,         className: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const ACTIVE_STAGES: Stage[] = ['chunking', 'embedding', 'indexing'];

export function AdminDashboard() {
  const { getToken } = useAuth();
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}` });

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`, { headers: authHeaders() });
      if (!res.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await res.json();
      setDocuments(data.map((d: any) => ({
        filename: d.filename,
        uploadedAt: d.uploadedAt,
        chunkCount: d.chunkCount,
        version: d.version ?? 1,
        stage: (d.stage ?? 'done') as Stage,
        errorReason: d.errorReason
      })));
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const updateDoc = (filename: string, patch: Partial<Doc>) => {
    setDocuments(prev => prev.map(d => d.filename === filename ? { ...d, ...patch } : d));
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;

    // Upsert rows immediately as "chunking"
    setDocuments(prev => {
      const next = [...prev];
      for (const f of acceptedFiles) {
        const stub: Doc = { filename: f.name, uploadedAt: new Date().toISOString(), chunkCount: 0, version: 0, stage: 'chunking' };
        const idx = next.findIndex(d => d.filename === f.name);
        if (idx !== -1) next[idx] = stub;
        else next.unshift(stub);
      }
      return next;
    });

    const formData = new FormData();
    acceptedFiles.forEach(f => formData.append('pdf', f));

    try {
      const res = await fetch(`${API_BASE}/upload/admin`, {
        method: 'POST',
        body: formData,
        headers: authHeaders()
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        for (const f of acceptedFiles) {
          updateDoc(f.name, { stage: 'error', errorReason: err.error });
        }
        return;
      }

      const result = await res.json().catch(() => ({ success: true }));
      if (!result.success) {
        for (const f of acceptedFiles) {
          updateDoc(f.name, { stage: 'error', errorReason: result.error || 'Upload failed' });
        }
        return;
      }

      await fetchDocs();
    } catch {
      for (const f of acceptedFiles) {
        updateDoc(f.name, { stage: 'error', errorReason: 'Connection error' });
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }
  } as any);

  const handleDelete = async (filename: string) => {
    setDocuments(prev => prev.filter(d => d.filename !== filename));
    try {
      await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}`, { method: 'DELETE', headers: authHeaders() });
    } catch {
      fetchDocs();
    }
  };

  const filteredDocs = documents.filter(d =>
    d.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 lg:p-8 text-zinc-50">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-50 tracking-tight">Knowledge Base</h1>
          <p className="text-zinc-400 mt-1 font-medium text-sm">Manage documents used by the OpsMind RAG system.</p>
        </div>

        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer bg-zinc-900 group",
            isDragActive ? "border-blue-500 bg-blue-500/5 scale-[1.01]" : "border-white/10 hover:border-blue-500/50 hover:bg-zinc-800/50"
          )}
        >
          <input {...getInputProps()} />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            title="Upload PDF files"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              void onDrop(files);
              e.target.value = '';
            }}
          />
          <div className="w-16 h-16 bg-zinc-800 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <FileUp className="w-8 h-8" />
          </div>
          <p className="text-lg font-bold text-zinc-50 mb-1">
            {isDragActive ? 'Drop PDF files here...' : 'Drag & drop PDF files'}
          </p>
          <p className="text-sm font-medium text-zinc-400">or click to select files from your computer</p>
          <div className="mt-5">
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Extra Upload Option (Admin)
            </Button>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap bg-zinc-900">
            <h2 className="font-bold text-zinc-50 text-lg">Uploaded SOPs</h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search filenames..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-zinc-950 border-white/10 text-zinc-50 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-800 text-zinc-400 font-bold border-b border-white/10 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">Filename</th>
                  <th className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">Chunks</th>
                  <th className="px-6 py-4 whitespace-nowrap hidden md:table-cell">Upload Date</th>
                  <th className="px-6 py-4 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-medium">
                      No documents found.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map(doc => {
                    const cfg = STAGE_CONFIG[doc.stage];
                    const isActive = ACTIVE_STAGES.includes(doc.stage);
                    return (
                      <tr key={doc.filename} className="hover:bg-zinc-800 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                            <span className="font-semibold text-zinc-300 group-hover:text-zinc-50 transition-colors truncate max-w-[150px] md:max-w-xs lg:max-w-md text-[14px]">
                              {doc.filename}
                            </span>
                            {doc.version > 1 && (
                              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
                                v{doc.version}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-400 font-medium hidden sm:table-cell">
                          {doc.chunkCount > 0 ? `${doc.chunkCount} chunks` : '—'}
                        </td>
                        <td className="px-6 py-4 text-zinc-400 font-medium hidden md:table-cell">
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-bold tracking-wide',
                              cfg.className
                            )}
                            title={doc.stage === 'error' ? doc.errorReason : undefined}
                          >
                            {isActive
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : cfg.icon
                            }
                            {cfg.label.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc.filename)}
                            disabled={isActive}
                            className="h-9 w-9 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
