
import React from 'react';
import type { TranscriptionRecord } from '../types';

interface HistoryPanelProps {
  history: TranscriptionRecord[];
  onViewTranscript: (recordId: string) => void;
  onDeleteTranscript: (recordId: string) => void;
  onUploadNew: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onViewTranscript,
  onDeleteTranscript,
  onUploadNew,
}) => {
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Lịch sử bóc băng</h2>
          <p className="text-slate-500 dark:text-slate-400">Quản lý và xem lại các tệp âm thanh đã chuyển đổi của bạn</p>
        </div>
        <button 
          onClick={onUploadNew}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm hover:shadow-md transition-all"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          Tải lên tệp mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-lg">apps</span>
          Tất cả
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold shrink-0 hover:bg-slate-50 transition-colors">
          <span className="material-symbols-outlined text-lg text-green-500">check_circle</span>
          Hoàn thành
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold shrink-0 hover:bg-slate-50 transition-colors">
          <span className="material-symbols-outlined text-lg text-blue-500">pending</span>
          Đang xử lý
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold shrink-0 hover:bg-slate-50 transition-colors">
          <span className="material-symbols-outlined text-lg text-red-500">error</span>
          Lỗi
        </button>
      </div>

      {/* Table Container (Desktop) / Card Container (Mobile) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tên tệp</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Thời lượng</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Chi phí</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                    Chưa có bản ghi nào. Hãy tải lên tệp âm thanh đầu tiên của bạn!
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined">audiotrack</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px]" title={record.fileName}>
                            {record.fileName}
                          </p>
                          <p className="text-[10px] text-slate-500">{formatDate(record.date)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center text-sm text-slate-600 dark:text-slate-400">
                      {record.durationMinutes ? `${record.durationMinutes}p` : 'N/A'}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-500">
                        <span className="material-symbols-outlined text-sm fill-icon">token</span>
                        {record.bpointsConsumed || 0}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => onViewTranscript(record.id)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                          title="Xem"
                        >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <button 
                          onClick={() => onDeleteTranscript(record.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                          title="Xóa"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {history.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">
              Chưa có bản ghi nào. Hãy tải lên tệp âm thanh đầu tiên của bạn!
            </div>
          ) : (
            history.map((record) => (
              <div key={record.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined">audiotrack</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={record.fileName}>
                        {record.fileName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-500">{formatDate(record.date)}</p>
                        <span className="text-slate-300">|</span>
                        <p className="text-[10px] text-slate-500">{record.durationMinutes || 0}p</p>
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-500 shrink-0">
                    <span className="material-symbols-outlined text-[12px] fill-icon">token</span>
                    {record.bpointsConsumed || 0}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button 
                    onClick={() => onViewTranscript(record.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    Xem bản ghi
                  </button>
                  <button 
                    onClick={() => onDeleteTranscript(record.id)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Mock */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500">Hiển thị {history.length} tệp</p>
          <div className="flex gap-2">
            <button className="size-8 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="size-8 flex items-center justify-center rounded bg-primary text-white text-xs font-bold">1</button>
            <button className="size-8 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
