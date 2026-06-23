
import React from 'react';

interface ProgressBarProps {
  isVisible?: boolean;
  percentage?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage = 85 }) => {
  return (
    <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px] text-primary">database</span>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Gói miễn phí
          </p>
        </div>
        <span className="text-xs font-bold text-primary">{percentage}%</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
        <div className="bg-primary h-full" style={{ width: `${percentage}%` }}></div>
      </div>
      <button className="w-full bg-primary hover:bg-primary/90 text-white text-sm font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-lg">bolt</span>
        Nâng cấp ngay
      </button>
    </div>
  );
};
