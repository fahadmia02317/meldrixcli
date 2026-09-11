import React from 'react';
import { X, Check, FileCode, Plus, Minus } from 'lucide-react';

interface DiffViewerModalProps {
  filePath: string;
  originalContent: string;
  proposedContent: string;
  onApply: () => void;
  onClose: () => void;
}

export const DiffViewerModal: React.FC<DiffViewerModalProps> = ({
  filePath,
  originalContent,
  proposedContent,
  onApply,
  onClose
}) => {
  // Simple LCS Diff calculation for UI display
  const oldLines = originalContent ? originalContent.split('\n') : [];
  const newLines = proposedContent ? proposedContent.split('\n') : [];

  // Compute unified diff lines
  const diffRows: Array<{ type: 'add' | 'del' | 'same'; text: string; oldNum?: number; newNum?: number }> = [];
  
  let o = 0;
  let n = 0;

  // Simple clean visual diff presentation
  const max = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < max; i++) {
    const oldL = oldLines[i];
    const newL = newLines[i];

    if (oldL === newL) {
      if (oldL !== undefined) {
        o++;
        n++;
        diffRows.push({ type: 'same', text: oldL, oldNum: o, newNum: n });
      }
    } else {
      if (oldL !== undefined) {
        o++;
        diffRows.push({ type: 'del', text: oldL, oldNum: o });
      }
      if (newL !== undefined) {
        n++;
        diffRows.push({ type: 'add', text: newL, newNum: n });
      }
    }
  }

  const additions = diffRows.filter((r) => r.type === 'add').length;
  const deletions = diffRows.filter((r) => r.type === 'del').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCode className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">{filePath}</h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <Plus className="w-3 h-3" /> {additions} additions
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-rose-400 flex items-center gap-0.5">
                  <Minus className="w-3 h-3" /> {deletions} deletions
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 text-xs space-y-0.5 select-text">
          {diffRows.map((row, idx) => (
            <div
              key={idx}
              className={`flex items-start font-mono leading-5 px-2 py-0.5 rounded ${
                row.type === 'add'
                  ? 'bg-emerald-950/40 text-emerald-300'
                  : row.type === 'del'
                  ? 'bg-rose-950/40 text-rose-300'
                  : 'text-slate-400 hover:bg-slate-900/40'
              }`}
            >
              <span className="w-8 text-right select-none text-slate-600 mr-2 text-[10px]">
                {row.oldNum || ''}
              </span>
              <span className="w-8 text-right select-none text-slate-600 mr-3 text-[10px]">
                {row.newNum || ''}
              </span>
              <span className="w-5 select-none font-bold">
                {row.type === 'add' ? '+' : row.type === 'del' ? '-' : ' '}
              </span>
              <span className="flex-1 whitespace-pre-wrap">{row.text}</span>
            </div>
          ))}
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between font-sans">
          <p className="text-xs text-slate-500">
            Confirming will overwrite the workspace file with these proposed modifications.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Reject / Close
            </button>

            <button
              onClick={() => {
                onApply();
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Accept and Apply Diff
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
