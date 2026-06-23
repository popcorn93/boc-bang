
import React from 'react';

interface TranscriptionDisplayProps {
  transcript: string;
  onSaveToGoogleDocs: () => void;
  onCopyToClipboard: () => void;
  isTranscriptionLoading: boolean;
  fileName?: string;
  onStructureTranscript?: () => void;
  isStructuring?: boolean;
  isSavingToGoogleDocs?: boolean;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  transcript,
  onSaveToGoogleDocs,
  onCopyToClipboard,
  isTranscriptionLoading,
  fileName,
  onStructureTranscript,
  isStructuring,
  isSavingToGoogleDocs,
}) => {
  const parseTranscript = (text: string) => {
    const lines = text.split('\n');
    const segments: { time: string; text: string }[] = [];
    
    const timestampRegex = /^\[(\d{2}):(\d{2})\]\s*(.*)/;
    
    let currentText = '';
    let currentTimeStr = '00:00';

    lines.forEach((line) => {
      const match = line.match(timestampRegex);
      if (match) {
        if (currentText) {
          segments.push({ time: currentTimeStr, text: currentText.trim() });
        }
        currentTimeStr = `${match[1]}:${match[2]}`;
        currentText = match[3];
      } else {
        currentText += (currentText ? '\n' : '') + line;
      }
    });

    if (currentText || segments.length === 0) {
      segments.push({ time: currentTimeStr, text: currentText.trim() || text });
    }

    return segments;
  };

  const segments = parseTranscript(transcript);

  if (!transcript && !isTranscriptionLoading) {
    return null;
  }

  return (
    <div className="w-full mt-4 lg:mt-8">
      <div className="flex flex-col gap-6">
        {/* Header with Info and Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-xl border border-primary/10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">description</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate max-w-[300px]">
                {fileName || 'Bản ghi mới'}
              </h2>
              <p className="text-sm text-slate-500">
                {isTranscriptionLoading ? 'Đang xử lý...' : `Hoàn thành • ${transcript.length} ký tự`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={onCopyToClipboard}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-primary/20 text-primary font-bold hover:bg-primary/5 transition-colors"
              title="Sao chép"
            >
              <span className="material-symbols-outlined text-[20px]">content_copy</span>
              <span className="lg:hidden xl:inline">Sao chép</span>
            </button>
            <button 
              onClick={onSaveToGoogleDocs}
              disabled={isSavingToGoogleDocs}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
              title="Lưu vào Google Docs"
            >
              <span className="material-symbols-outlined text-[20px]">description</span>
              <span className="lg:hidden xl:inline">{isSavingToGoogleDocs ? 'Đang lưu...' : 'Lưu Google Doc'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Transcript Area */}
        <div className="relative group">
          <div className="max-h-[600px] overflow-y-auto rounded-xl border border-primary/10 bg-white dark:bg-slate-900/40 shadow-sm custom-scrollbar">
            <div className="p-6 lg:p-8">
              {isTranscriptionLoading && !transcript ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="font-medium text-lg">AI đang bóc băng âm thanh của bạn...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {segments.map((segment, idx) => {
                    // Extract speaker if present (e.g., "[00:00] Người nói 1: ...")
                    const speakerMatch = segment.text.match(/^(Người nói \d+):\s*(.*)/);
                    const speaker = speakerMatch ? speakerMatch[1] : null;
                    const content = speakerMatch ? speakerMatch[2] : segment.text;

                    return (
                      <div key={idx} className="flex gap-4 lg:gap-6 group/segment">
                        <div className="flex flex-col items-center">
                          <div className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-tighter">
                            {segment.time}
                          </div>
                          <div className="w-[1px] flex-1 mt-3 bg-slate-200 dark:bg-slate-800 group-last/segment:hidden"></div>
                        </div>
                        <div className="flex-1 pb-2">
                          {speaker && (
                            <p className="text-sm font-bold text-primary mb-1.5 uppercase tracking-wide">
                              {speaker}
                            </p>
                          )}
                          <p className="text-base lg:text-lg leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Scroll Indicator Gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-slate-900/40 to-transparent pointer-events-none rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      </div>
    </div>
  );
};

