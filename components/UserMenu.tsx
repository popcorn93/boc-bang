
import React from 'react';

interface UserMenuProps {
  user: string;
  bpoints: number;
  onLogout: () => void;
  onViewProfile: () => void;
  onAddCredits: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, bpoints, onLogout, onViewProfile, onAddCredits }) => {
  return (
    <div className="pt-4 border-t border-primary/10">
      <div className="flex items-center gap-3 px-2 py-2 group cursor-pointer" onClick={onViewProfile}>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
          <div 
            className="w-full h-full bg-cover bg-center" 
            style={{ backgroundImage: "url('https://picsum.photos/seed/user/100/100')" }}
          ></div>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{user}</p>
            <span className="material-symbols-outlined text-[14px] text-blue-500 fill-icon">verified</span>
          </div>
          <div 
            className="flex items-center gap-1.5 text-xs font-bold text-primary cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onAddCredits();
            }}
          >
            <span className="material-symbols-outlined text-[16px] fill-icon text-yellow-500">token</span>
            {bpoints > 100000 ? 'Không giới hạn' : `${bpoints.toLocaleString()} Bpoint`}
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onLogout();
          }}
          className="text-slate-400 hover:text-red-500 transition-colors"
          title="Đăng xuất"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
        </button>
      </div>
    </div>
  );
};
