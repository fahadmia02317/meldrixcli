import React, { useState } from 'react';
import { FileCode, Plus, Trash2, CheckCircle, Circle, Layers, FileText, Code2, AlertCircle } from 'lucide-react';
import { WorkspaceFile } from '../types';

interface WorkspaceProps {
  files: WorkspaceFile[];
  onToggleContext: (path: string) => void;
  onUpdateFileContent: (path: string, content: string) => void;
  onCreateFile: (path: string, content: string) => void;
}

export const WorkspaceFiles: React.FC<WorkspaceProps> = ({
  files,
  onToggleContext,
  onUpdateFileContent,
  onCreateFile
}) => {
  const [selectedPath, setSelectedPath] = useState<string>(files[0]?.path || '');
  const [isCreating, setIsCreating] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');

  const currentFile = files.find((f) => f.path === selectedPath) || files[0];
  const contextFiles = files.filter((f) => f.inContext);
  const totalTokens = contextFiles.reduce((acc, f) => acc + f.tokens, 0);

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath.trim()) return;
    const cleanPath = newFilePath.trim();
    onCreateFile(cleanPath, '// New file created in Code-CLI workspace\n');
    setSelectedPath(cleanPath);
    setNewFilePath('');
    setIsCreating(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-65px)] bg-slate-950 text-slate-200">
      {/* Sidebar: Files List & Context Status */}
      <div className="w-full lg:w-80 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-xs tracking-wider uppercase text-slate-300">
              Workspace Files
            </span>
          </div>

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1"
            title="Create new file"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Token Context Summary Box */}
        <div className="bg-slate-950/60 p-3 border-b border-slate-800/80 text-xs">
          <div className="flex items-center justify-between text-slate-400 pb-1">
            <span>Agent Context:</span>
            <span className="font-semibold text-emerald-400">{contextFiles.length} of {files.length} files</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Estimated Token Size:</span>
            <span className="font-mono text-slate-300">~{totalTokens} tokens</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            Toggle files to include them in the LLM's system prompt (equivalent to <code className="text-emerald-400 font-mono">/add &lt;file&gt;</code>).
          </p>
        </div>

        {/* New File Input */}
        {isCreating && (
          <form onSubmit={handleCreateNew} className="p-2 bg-slate-800/80 border-b border-slate-700 flex gap-2">
            <input
              type="text"
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              placeholder="e.g. src/utils.ts"
              autoFocus
              className="flex-1 bg-slate-950 text-xs text-white px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium"
            >
              Add
            </button>
          </form>
        )}

        {/* Files Tree List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {files.map((file) => {
            const isSelected = file.path === selectedPath;
            return (
              <div
                key={file.path}
                onClick={() => setSelectedPath(file.path)}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-medium'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="font-mono truncate">{file.path}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {file.lines}L
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleContext(file.path);
                    }}
                    title={file.inContext ? 'Remove from agent context (/drop)' : 'Add to agent context (/add)'}
                    className={`p-1 rounded transition-colors ${
                      file.inContext
                        ? 'text-emerald-400 hover:text-emerald-300'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    {file.inContext ? (
                      <CheckCircle className="w-3.5 h-3.5 fill-emerald-500/20 text-emerald-400" />
                    ) : (
                      <Circle className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main: File Content Editor / Viewer */}
      <div className="flex-1 flex flex-col bg-slate-950">
        {currentFile ? (
          <>
            {/* Editor Header */}
            <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-sm text-white font-medium">
                  {currentFile.path}
                </span>
                <span className="text-xs text-slate-500">
                  {currentFile.lines} lines • ~{currentFile.tokens} tokens
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleContext(currentFile.path)}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    currentFile.inContext
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {currentFile.inContext ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      In Agent Context
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Add to Context (/add)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Textarea with line numbers */}
            <div className="flex-1 relative overflow-hidden flex bg-slate-950 font-mono text-xs">
              {/* Line Numbers gutter */}
              <div className="bg-slate-900/60 select-none py-3 px-3 text-right text-slate-600 font-mono border-r border-slate-800/80">
                {Array.from({ length: currentFile.content.split('\n').length }).map((_, i) => (
                  <div key={i} className="leading-5 h-5">{i + 1}</div>
                ))}
              </div>

              {/* Editable code area */}
              <textarea
                value={currentFile.content}
                onChange={(e) => onUpdateFileContent(currentFile.path, e.target.value)}
                spellCheck={false}
                className="flex-1 p-3 bg-transparent text-slate-200 resize-none focus:outline-none font-mono text-xs leading-5 whitespace-pre selection:bg-emerald-500/30"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Select a file to inspect its contents.
          </div>
        )}
      </div>
    </div>
  );
};
