
import React, { useState } from 'react';

interface RegisterProps {
  onRegister: (email: string, password: string) => Promise<void>;
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegister, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        setError('Vui lòng nhập một địa chỉ email hợp lệ.');
        return;
    }
    
    setIsSubmitting(true);
    try {
      await onRegister(email.trim(), password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tạo tài khoản. Vui lòng thử lại.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col justify-center items-center p-4 font-display">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
            <div className="bg-primary rounded-xl p-3 inline-flex items-center justify-center mb-4 shadow-lg">
              <span className="material-symbols-outlined text-white text-4xl">graphic_eq</span>
            </div>
            <h1 className="text-3xl font-black text-primary tracking-tight">Bóc Băng</h1>
            <p className="mt-2 text-slate-500 font-medium">Tạo tài khoản mới</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-2xl border border-primary/10">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-8">Đăng ký</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Địa chỉ Email
              </label>
              <input
                id="email"
                type="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary transition"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                required
                disabled={isSubmitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary transition"
                placeholder="••••••••••••"
              />
            </div>
             <div>
              <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Xác nhận Mật khẩu
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                disabled={isSubmitting}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary transition"
                placeholder="••••••••••••"
              />
            </div>
            
            {error && (
              <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              >
                {isSubmitting ? 'Đang tạo...' : 'Đăng Ký'}
              </button>
            </div>
          </form>
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Đã có tài khoản?{' '}
              <button onClick={onSwitchToLogin} className="font-bold text-primary hover:underline">
                Đăng nhập
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
