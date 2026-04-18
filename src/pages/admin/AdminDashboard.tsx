import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Document } from '../../types';
import { FileUp, FileText, Search, Trash2, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';

// Mock data
const INITIAL_DOCS: Document[] = [
  { id: 'd1', filename: 'Employee Handbook 2026.pdf', uploadDate: new Date(Date.now() - 86400000 * 2), status: 'ready', size: 2500000 },
  { id: 'd2', filename: 'Security SOP v2.pdf', uploadDate: new Date(Date.now() - 86400000 * 5), status: 'ready', size: 1200000 },
  { id: 'd3', filename: 'Engineering Onboarding.pdf', uploadDate: new Date(Date.now() - 3600000 * 4), status: 'processing', size: 3400000 },
];

export function AdminDashboard() {
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCS);
  const [search, setSearch] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    const newDocs: Document[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      filename: file.name,
      uploadDate: new Date(),
      status: 'processing',
      size: file.size
    }));
    
    setDocuments(prev => [...newDocs, ...prev]);

    // Simulate backend processing
    setTimeout(() => {
      setDocuments(prev => prev.map(doc => 
        newDocs.find(nd => nd.id === doc.id) ? { ...doc, status: 'ready' } : doc
      ));
    }, 4000);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }
  } as any);

  const handleDelete = (id: string) => {
    // In a real app this would use a real dialog and API
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const filteredDocs = documents.filter(d => d.filename.toLowerCase().includes(search.toLowerCase()));

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

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
          <div className="w-16 h-16 bg-zinc-800 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <FileUp className="w-8 h-8" />
          </div>
          <p className="text-lg font-bold text-zinc-50 mb-1">
            {isDragActive ? "Drop PDF files here..." : "Drag & drop PDF files"}
          </p>
          <p className="text-sm font-medium text-zinc-400">
            or click to select files from your computer
          </p>
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
                className="pl-9 bg-zinc-950 border-white/10 text-zinc-50 focus-visible:ring-blue-500 transition-shadow"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-800 text-zinc-400 font-bold border-b border-white/10 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">Filename</th>
                  <th className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">Size</th>
                  <th className="px-6 py-4 whitespace-nowrap hidden md:table-cell">Upload Date</th>
                  <th className="px-6 py-4 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-medium bg-zinc-900/50">
                      No documents found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map(doc => (
                    <tr key={doc.id} className="hover:bg-zinc-800 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                          <span className="font-semibold text-zinc-300 group-hover:text-zinc-50 transition-colors truncate max-w-[150px] md:max-w-xs lg:max-w-md text-[14px]">
                            {doc.filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 font-medium hidden sm:table-cell">
                        {formatSize(doc.size)}
                      </td>
                      <td className="px-6 py-4 text-zinc-400 font-medium hidden md:table-cell">
                        {format(doc.uploadDate, 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4">
                        {doc.status === 'ready' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold tracking-wide">
                            <CheckCircle2 className="w-3.5 h-3.5" /> READY
                          </span>
                        )}
                        {doc.status === 'processing' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold tracking-wide">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> PROCESSING
                          </span>
                        )}
                        {doc.status === 'error' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold tracking-wide">
                            <AlertCircle className="w-3.5 h-3.5" /> ERROR
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id)}
                          className="h-9 w-9 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          title="Delete document"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
