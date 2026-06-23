
import React, { useMemo } from 'react';
import { sanitizeStructuredHtml } from '../services/htmlService';

interface StructuredDisplayProps {
  structuredTranscript: string;
  onSaveToGoogleDocs: () => void;
  onCopyToClipboard: () => void;
  isSavingToGoogleDocs?: boolean;
}

export const StructuredDisplay: React.FC<StructuredDisplayProps> = ({
  structuredTranscript,
  onSaveToGoogleDocs,
  onCopyToClipboard,
  isSavingToGoogleDocs,
}) => {
  const safeHtml = useMemo(
    () => sanitizeStructuredHtml(structuredTranscript.replace(/\n/g, '<br />')),
    [structuredTranscript]
  );

  return (
    <div className="mt-12 rounded-lg border border-primary/20 bg-primary/5 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-[24px] fill-icon">auto_awesome</span>
          <span className="text-sm font-bold uppercase tracking-wider">AI Gợi ý tóm tắt & Cấu trúc</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onCopyToClipboard}
            className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
            title="Sao chép"
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
          </button>
          <button 
            onClick={onSaveToGoogleDocs}
            disabled={isSavingToGoogleDocs}
            className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
            title="Lưu vào Google Docs"
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
          </button>
        </div>
      </div>
      <div 
        className="text-slate-700 dark:text-slate-300 leading-relaxed prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </div>
  );
};
