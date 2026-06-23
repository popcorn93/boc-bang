
import React, { useState } from 'react';

interface LoginProps {
  onEmailLogin: (email: string, password: string) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onSwitchToRegister: () => void;
  isGoogleLoginLoading?: boolean;
}

export const Login: React.FC<LoginProps> = ({ onEmailLogin, onGoogleLogin, onSwitchToRegister, isGoogleLoginLoading = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    setIsSubmitting(true);
    try {
      await onEmailLogin(email.trim(), password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể đăng nhập. Vui lòng thử lại.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    setError('');
    try {
      await onGoogleLogin();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể đăng nhập bằng Google. Vui lòng thử lại.';
      setError(message);
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
            <p className="mt-2 text-slate-500 font-medium">AI Transcription Platform</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-2xl border border-primary/10">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-8">Đăng nhập</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Email
              </label>
              <input
                id="username"
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
            
            {error && (
              <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
            )}

            <div className="space-y-4 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isGoogleLoginLoading}
                className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              >
                {isSubmitting ? 'Đang đăng nhập...' : 'Tiếp tục'}
              </button>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting || isGoogleLoginLoading}
                data-testid="google-login-button"
                className="w-full flex items-center justify-center py-4 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:cursor-wait disabled:opacity-70"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-3" alt="Google" />
                {isGoogleLoginLoading ? 'Đang chuyển tới Google...' : 'Đăng nhập với Google'}
              </button>
            </div>
          </form>
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Chưa có tài khoản?{' '}
              <button onClick={onSwitchToRegister} className="font-bold text-primary hover:underline">
                Đăng ký ngay
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
