import React, { useCallback, useState, useEffect } from 'react';
import { collection, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { approvePaymentRequest, listPaymentRequests, reconcilePaymentRequest, rejectPaymentRequest } from '../services/paymentService';
import type { PaymentRequest, UserProfile } from '../types';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBpoints: 0,
    totalTranscriptions: 0,
  });

  useEffect(() => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('email', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList: UserProfile[] = [];
      let totalB = 0;
      let totalT = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        userList.push(data);
        totalB += data.bpoints || 0;
        totalT += data.totalTranscriptions || 0;
      });

      setUsers(userList);
      setStats({
        totalUsers: userList.length,
        totalBpoints: totalB,
        totalTranscriptions: totalT,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadPaymentRequests = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const requestList = await listPaymentRequests();
      setPaymentRequests(requestList);
    } catch (error) {
      console.error('Error loading payment requests:', error);
      alert(error instanceof Error ? error.message : 'Không thể tải danh sách yêu cầu nạp.');
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPaymentRequests();
  }, [loadPaymentRequests]);

  const handleAdjustBpoints = async (userId: string, currentPoints: number, amount: number) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        bpoints: Math.max(0, currentPoints + amount),
      });
    } catch (error) {
      console.error('Error adjusting Bpoints:', error);
      alert('Lỗi khi điều chỉnh Bpoint.');
    }
  };

  const handleToggleUnlimited = async (userId: string, currentState: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isUnlimited: !currentState,
      });
    } catch (error) {
      console.error('Error toggling unlimited state:', error);
      alert('Lỗi khi thay đổi trạng thái không giới hạn.');
    }
  };

  const handleToggleAdmin = async (userId: string, currentState: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isAdmin: !currentState,
      });
    } catch (error) {
      console.error('Error toggling admin state:', error);
      alert('Lỗi khi thay đổi trạng thái admin.');
    }
  };

  const handleApprovePayment = async (requestId: string) => {
    try {
      const bankReference = window.prompt('Nhập mã tham chiếu giao dịch ngân hàng:')?.trim();
      if (!bankReference) {
        return;
      }

      const evidenceNote = window.prompt('Nhập link ảnh xác nhận hoặc ghi chú chứng từ:')?.trim();
      if (!evidenceNote) {
        return;
      }

      await approvePaymentRequest(requestId, { bankReference, evidenceNote });
      await loadPaymentRequests();
    } catch (error) {
      console.error('Error approving payment:', error);
      alert(error instanceof Error ? error.message : 'Lỗi khi duyệt yêu cầu nạp.');
    }
  };

  const handleReconcilePayment = async (requestId: string) => {
    try {
      const request = await reconcilePaymentRequest(requestId);
      const paid = Number(request.payosAmountPaid || 0).toLocaleString('vi-VN');
      alert(`Đã đối soát payOS. Trạng thái: ${request.payosStatus || request.status}. Đã thanh toán: ${paid}đ.`);
      await loadPaymentRequests();
    } catch (error) {
      console.error('Error reconciling payment:', error);
      alert(error instanceof Error ? error.message : 'Lỗi khi đối soát payOS.');
    }
  };

  const handleRejectPayment = async (requestId: string) => {
    try {
      await rejectPaymentRequest(requestId);
      await loadPaymentRequests();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert(error instanceof Error ? error.message : 'Lỗi khi từ chối yêu cầu nạp.');
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatMoney = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;

  const paymentStatusText = (status: PaymentRequest['status']) => {
    if (status === 'approved') return 'Đã duyệt';
    if (status === 'rejected') return 'Từ chối';
    if (status === 'cancelled') return 'Đã hủy';
    if (status === 'expired') return 'Hết hạn';
    return 'Chờ duyệt';
  };

  const paymentStatusClass = (status: PaymentRequest['status']) => {
    if (status === 'approved') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
    if (status === 'cancelled' || status === 'expired') return 'bg-slate-100 text-slate-600 border-slate-200';
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  };

  const renderPaymentActions = (request: PaymentRequest, stacked = false) => {
    if (request.status !== 'pending') {
      return <span className="text-xs font-semibold text-slate-400">Đã xử lý</span>;
    }

    return (
      <div className={`flex ${stacked ? 'flex-col' : 'flex-wrap justify-end'} gap-2`}>
        {request.provider === 'payos' && (
          <button
            onClick={() => handleReconcilePayment(request.id)}
            className="min-h-10 rounded-lg border border-blue-100 px-3 text-xs font-bold text-blue-600 hover:bg-blue-50"
          >
            Đối soát payOS
          </button>
        )}
        <button
          onClick={() => handleRejectPayment(request.id)}
          className="min-h-10 rounded-lg border border-red-100 px-3 text-xs font-bold text-red-600 hover:bg-red-50"
        >
          Từ chối
        </button>
        <button
          onClick={() => handleApprovePayment(request.id)}
          className="min-h-10 rounded-lg bg-primary px-3 text-xs font-bold text-white hover:bg-primary/90"
        >
          Duyệt tay
        </button>
      </div>
    );
  };

  const renderBpointButtons = (user: UserProfile, compact = false) => (
    <div className={`flex items-center ${compact ? 'justify-between' : 'justify-end'} gap-1`}>
      <button
        onClick={() => handleAdjustBpoints(user.uid, user.bpoints, -50)}
        className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100"
        title="-50 Bpoint"
      >
        <span className="material-symbols-outlined text-sm">remove</span>
      </button>
      <button
        onClick={() => handleAdjustBpoints(user.uid, user.bpoints, -10)}
        className="flex size-10 items-center justify-center rounded-lg border border-red-100 text-red-500 transition-colors hover:bg-red-50"
        title="-10 Bpoint"
      >
        <span className="material-symbols-outlined text-sm">keyboard_arrow_left</span>
      </button>
      <span className="min-w-10 text-center text-xs font-black">{user.bpoints}</span>
      <button
        onClick={() => handleAdjustBpoints(user.uid, user.bpoints, 10)}
        className="flex size-10 items-center justify-center rounded-lg border border-green-100 text-green-500 transition-colors hover:bg-green-50"
        title="+10 Bpoint"
      >
        <span className="material-symbols-outlined text-sm">keyboard_arrow_right</span>
      </button>
      <button
        onClick={() => handleAdjustBpoints(user.uid, user.bpoints, 50)}
        className="flex size-10 items-center justify-center rounded-lg bg-green-50 text-green-600 transition-colors hover:bg-green-100"
        title="+50 Bpoint"
      >
        <span className="material-symbols-outlined text-sm">add</span>
      </button>
    </div>
  );

  const renderUserBadges = (user: UserProfile) => (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => handleToggleUnlimited(user.uid, !!user.isUnlimited)}
        className={`min-h-9 rounded-full border px-3 text-[10px] font-black uppercase tracking-wider transition-all ${
          user.isUnlimited
            ? 'border-purple-200 bg-purple-100 text-purple-700'
            : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-purple-50 hover:text-purple-600'
        }`}
      >
        {user.isUnlimited ? 'Unlimited' : 'Standard'}
      </button>
      <button
        onClick={() => handleToggleAdmin(user.uid, !!user.isAdmin)}
        className={`min-h-9 rounded-full border px-3 text-[10px] font-black uppercase tracking-wider transition-all ${
          user.isAdmin
            ? 'border-red-200 bg-red-100 text-red-700'
            : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600'
        }`}
      >
        {user.isAdmin ? 'Admin' : 'User'}
      </button>
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-none bg-white dark:bg-background-dark lg:rounded-2xl lg:border lg:border-primary/10">
      <div className="flex items-start justify-between gap-3 border-b border-primary/10 bg-slate-50/70 p-4 dark:bg-slate-900/50 sm:p-6">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-black text-primary sm:text-2xl">
            <span className="material-symbols-outlined">dashboard_customize</span>
            <span className="truncate">Admin Dashboard</span>
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Quản lý Bpoint, thanh toán và người dùng</p>
        </div>
        <button
          onClick={onClose}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
          aria-label="Đóng dashboard"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 lg:space-y-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-6">
          <div className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm dark:bg-slate-900 sm:p-5">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-500">
                <span className="material-symbols-outlined">group</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 sm:text-sm">Người dùng</span>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalUsers}</p>
          </div>

          <div className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm dark:bg-slate-900 sm:p-5">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-yellow-50 p-2 text-yellow-600">
                <span className="material-symbols-outlined fill-icon">token</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 sm:text-sm">Bpoint hệ thống</span>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalBpoints.toLocaleString()}</p>
          </div>

          <div className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm dark:bg-slate-900 sm:p-5">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2 text-green-600">
                <span className="material-symbols-outlined">graphic_eq</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 sm:text-sm">Lượt gỡ băng</span>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalTranscriptions.toLocaleString()}</p>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
              <span className="material-symbols-outlined text-primary">payments</span>
              Yêu cầu nạp Bpoint
            </h3>
            <button
              onClick={() => void loadPaymentRequests()}
              className="flex min-h-10 items-center gap-1 rounded-lg border border-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/5"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
              Tải lại
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-primary/10 bg-white shadow-sm dark:bg-slate-900">
            <div className="md:hidden">
              {paymentsLoading ? (
                <div className="px-4 py-8 text-center text-slate-400">Đang tải yêu cầu nạp...</div>
              ) : paymentRequests.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400">Chưa có yêu cầu nạp nào.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-primary/10">
                  {paymentRequests.map((request) => (
                    <article key={request.id} className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900 dark:text-slate-100">{request.email || 'N/A'}</p>
                          <p className="mt-1 truncate font-mono text-[10px] text-slate-400">{request.userId}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${paymentStatusClass(request.status)}`}>
                          {paymentStatusText(request.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bpoint</p>
                          <p className="mt-1 font-black text-primary">{request.points.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Số tiền</p>
                          <p className="mt-1 font-black">{formatMoney(request.price)}</p>
                        </div>
                      </div>

                      <div className="space-y-1 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nội dung chuyển khoản</p>
                        <p className="break-words font-mono text-xs text-slate-600 dark:text-slate-300">{request.transferNote || '-'}</p>
                        {request.provider === 'payos' && (
                          <p className="text-[11px] font-medium text-slate-500">
                            payOS: {request.payosStatus || 'Chưa đối soát'} · Đã trả {formatMoney(request.payosAmountPaid || 0)}
                          </p>
                        )}
                        {request.manualBankReference && (
                          <p className="text-[11px] font-bold text-amber-600">Duyệt tay: {request.manualBankReference}</p>
                        )}
                      </div>

                      {renderPaymentActions(request, true)}
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4">Người dùng</th>
                    <th className="px-6 py-4">Bpoint</th>
                    <th className="px-6 py-4">Số tiền</th>
                    <th className="px-6 py-4">Nội dung CK</th>
                    <th className="px-6 py-4 text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
                  {paymentsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Đang tải yêu cầu nạp...</td>
                    </tr>
                  ) : paymentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Chưa có yêu cầu nạp nào.</td>
                    </tr>
                  ) : (
                    paymentRequests.map((request) => (
                      <tr key={request.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{request.email || 'N/A'}</span>
                            <span className="font-mono text-[10px] tracking-tight text-slate-400">{request.userId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-primary">{request.points.toLocaleString()}</td>
                        <td className="px-6 py-4 font-bold">{formatMoney(request.price)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-xs text-slate-500">{request.transferNote || '-'}</span>
                            {request.provider === 'payos' && (
                              <span className="text-[10px] text-slate-400">
                                payOS: {request.payosStatus || 'Chưa đối soát'} · Đã trả {formatMoney(request.payosAmountPaid || 0)}
                              </span>
                            )}
                            {request.manualBankReference && (
                              <span className="text-[10px] text-amber-600">Duyệt tay: {request.manualBankReference}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${paymentStatusClass(request.status)}`}>
                            {paymentStatusText(request.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">{renderPaymentActions(request)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <h3 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
              <span className="material-symbols-outlined text-primary">manage_accounts</span>
              Quản lý người dùng
            </h3>
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                placeholder="Tìm email hoặc UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-11 w-full rounded-xl border-none bg-slate-50 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-primary/10 bg-white shadow-sm dark:bg-slate-900">
            <div className="md:hidden">
              {loading ? (
                <div className="px-4 py-8 text-center text-slate-400">Đang tải dữ liệu...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400">Không tìm thấy người dùng phù hợp.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-primary/10">
                  {filteredUsers.map((user) => (
                    <article key={user.uid} className="space-y-4 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900 dark:text-slate-100">{user.email || 'N/A'}</p>
                        <p className="mt-1 truncate font-mono text-[10px] text-slate-400">{user.uid}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bpoint</p>
                          <div className="mt-1 flex items-center gap-1.5 font-black text-primary">
                            <span className="material-symbols-outlined fill-icon text-[18px] text-yellow-500">token</span>
                            {user.isUnlimited ? '∞' : user.bpoints.toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lượt dùng</p>
                          <p className="mt-1 font-black text-slate-700 dark:text-slate-200">{user.totalTranscriptions || 0} lần</p>
                        </div>
                      </div>

                      {renderUserBadges(user)}
                      {renderBpointButtons(user, true)}
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4">Người dùng</th>
                    <th className="px-6 py-4">Bpoint</th>
                    <th className="px-6 py-4">Lượt dùng</th>
                    <th className="px-6 py-4 text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-right">Thao tác Bpoint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Đang tải dữ liệu...</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Không tìm thấy người dùng phù hợp.</td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.uid} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{user.email || 'N/A'}</span>
                            <span className="font-mono text-[10px] tracking-tight text-slate-400">{user.uid}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 font-black text-primary">
                            <span className="material-symbols-outlined fill-icon text-[18px] text-yellow-500">token</span>
                            {user.isUnlimited ? '∞' : user.bpoints.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-600 dark:text-slate-400">{user.totalTranscriptions || 0} lần</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">{renderUserBadges(user)}</div>
                        </td>
                        <td className="px-6 py-4 text-right">{renderBpointButtons(user)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
