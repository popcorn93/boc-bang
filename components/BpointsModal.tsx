
import React, { useState } from 'react';

interface BpointPackage {
  id: string;
  points: number;
  bonusPercent: number;
  price: number;
}

const PACKAGES: BpointPackage[] = [
  { id: 'p10', points: 10, bonusPercent: 0, price: 3000 },
  { id: 'p20', points: 20, bonusPercent: 0, price: 6000 },
  { id: 'p50', points: 50, bonusPercent: 5, price: 15000 },
  { id: 'p100', points: 100, bonusPercent: 10, price: 30000 },
  { id: 'p200', points: 200, bonusPercent: 15, price: 60000 },
  { id: 'p500', points: 500, bonusPercent: 15, price: 150000 },
];

interface BpointsModalProps {
  onClose: () => void;
  onPaymentSubmitted: (packageId: string) => Promise<void>;
}

export const BpointsModal: React.FC<BpointsModalProps> = ({ onClose, onPaymentSubmitted }) => {
  const [selectedPackage, setSelectedPackage] = useState<BpointPackage | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const totalPoints = selectedPackage 
    ? Math.floor(selectedPackage.points * (1 + selectedPackage.bonusPercent / 100))
    : 0;

  const handleSubmitPaymentRequest = async () => {
    if (!selectedPackage) return;
    setError('');
    setIsVerifying(true);
    try {
      await onPaymentSubmitted(selectedPackage.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể gửi yêu cầu xác nhận.';
      setError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-background-dark w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Packages */}
        <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-primary/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined fill-icon text-yellow-500">token</span>
              Nạp Bpoint
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={`p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                  selectedPackage?.id === pkg.id
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-100 dark:border-primary/10 hover:border-primary/30'
                }`}
              >
                {pkg.bonusPercent > 0 && (
                  <div className="absolute top-0 right-0 bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                    +{pkg.bonusPercent}%
                  </div>
                )}
                <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {pkg.points} <span className="text-xs font-normal opacity-70">Bpoint</span>
                </div>
                <div className="text-sm text-primary font-bold">
                  {pkg.price.toLocaleString('vi-VN')}đ
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500 italic">
            * 1 Bpoint = 1 phút bóc băng = 300đ
          </p>
        </div>

        {/* Right Side: QR Code */}
        <div className="flex-1 p-6 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center min-h-[400px]">
          {selectedPackage ? (
            <div className="w-full space-y-4 flex flex-col items-center">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Thanh toán tự động qua payOS</p>
                <p className="text-2xl font-black text-primary">{selectedPackage.price.toLocaleString('vi-VN')}đ</p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-primary/20">
                <span className="material-symbols-outlined text-primary text-7xl">qr_code_scanner</span>
              </div>

              <div className="text-center text-xs text-slate-500 max-w-[200px]">
                Bạn sẽ được chuyển sang trang thanh toán bảo mật của payOS. Bpoint được cộng tự động khi giao dịch thành công.
              </div>

              {error && (
                <p className="w-full text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmitPaymentRequest}
                disabled={isVerifying}
                className="w-full h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    Đang tạo thanh toán...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">payments</span>
                    Thanh toán qua payOS
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4 text-slate-400">
              <span className="material-symbols-outlined text-6xl">qr_code_2</span>
              <p className="text-sm px-8">Vui lòng chọn gói nạp Bpoint ở bên trái để hiển thị mã QR thanh toán</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
