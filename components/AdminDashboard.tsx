
import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { approvePaymentRequest, reconcilePaymentRequest, rejectPaymentRequest } from '../services/paymentService';
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
    // List all users
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('email', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList: UserProfile[] = [];
      let totalB = 0;
      let totalT = 0;

      snapshot.forEach((doc) => {
        const data = doc.data() as UserProfile;
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

  useEffect(() => {
    const requestsRef = collection(db, 'paymentRequests');
    const q = query(requestsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestList = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      })) as PaymentRequest[];

      setPaymentRequests(requestList);
      setPaymentsLoading(false);
    }, (error) => {
      console.error("Error loading payment requests:", error);
      setPaymentsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdjustBpoints = async (userId: string, currentPoints: number, amount: number) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        bpoints: Math.max(0, currentPoints + amount)
      });
    } catch (error) {
      console.error("Error adjusting Bpoints:", error);
      alert("Lỗi khi điều chỉnh Bpoint.");
    }
  };

  const handleToggleUnlimited = async (userId: string, currentState: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isUnlimited: !currentState
      });
    } catch (error) {
      console.error("Error toggling unlimited state:", error);
      alert("Lỗi khi thay đổi trạng thái không giới hạn.");
    }
  };

  const handleToggleAdmin = async (userId: string, currentState: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isAdmin: !currentState
      });
    } catch (error) {
      console.error("Error toggling admin state:", error);
      alert("Lỗi khi thay đổi trạng thái admin.");
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
    } catch (error) {
      console.error("Error approving payment:", error);
      alert(error instanceof Error ? error.message : "Lỗi khi duyệt yêu cầu nạp.");
    }
  };

  const handleReconcilePayment = async (requestId: string) => {
    try {
      const request = await reconcilePaymentRequest(requestId);
      const paid = Number(request.payosAmountPaid || 0).toLocaleString('vi-VN');
      alert(`Đã đối soát payOS. Trạng thái: ${request.payosStatus || request.status}. Đã thanh toán: ${paid}đ.`);
    } catch (error) {
      console.error("Error reconciling payment:", error);
      alert(error instanceof Error ? error.message : "Lỗi khi đối soát payOS.");
    }
  };

  const handleRejectPayment = async (requestId: string) => {
    try {
      await rejectPaymentRequest(requestId);
    } catch (error) {
      console.error("Error rejecting payment:", error);
      alert(error instanceof Error ? error.message : "Lỗi khi từ chối yêu cầu nạp.");
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-background-dark">
      {/* Header */}
      <div className="p-6 border-b border-primary/10 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h2 className="text-2xl font-black text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">dashboard_customize</span>
            Admin Dashboard
          </h2>
          <p className="text-sm text-slate-500 font-medium">Quản lý hệ thống Bpoint và người dùng</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-primary/10 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                <span className="material-symbols-outlined">group</span>
              </div>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Tổng người dùng</span>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalUsers}</p>
          </div>
          
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-primary/10 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                <span className="material-symbols-outlined fill-icon">token</span>
              </div>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Tổng Bpoint hệ thống</span>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalBpoints.toLocaleString()}</p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-primary/10 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                <span className="material-symbols-outlined">graphic_eq</span>
              </div>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Tổng lượt gỡ băng</span>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalTranscriptions.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            Yêu cầu nạp Bpoint
          </h3>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
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
                      <tr key={request.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{request.email || 'N/A'}</span>
                            <span className="text-[10px] text-slate-400 font-mono tracking-tight">{request.userId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-primary">{request.points.toLocaleString()}</td>
                        <td className="px-6 py-4 font-bold">{request.price.toLocaleString('vi-VN')}đ</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-xs text-slate-500">{request.transferNote || '-'}</span>
                            {request.provider === 'payos' && (
                              <span className="text-[10px] text-slate-400">
                                payOS: {request.payosStatus || 'Chưa đối soát'} · Đã trả {(request.payosAmountPaid || 0).toLocaleString('vi-VN')}đ
                              </span>
                            )}
                            {request.manualBankReference && (
                              <span className="text-[10px] text-amber-600">
                                Duyệt tay: {request.manualBankReference}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            request.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : request.status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {request.status === 'approved' ? 'Đã duyệt' : request.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {request.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              {request.provider === 'payos' && (
                                <button
                                  onClick={() => handleReconcilePayment(request.id)}
                                  className="px-3 py-1.5 rounded-lg border border-blue-100 text-blue-600 hover:bg-blue-50 text-xs font-bold"
                                >
                                  Đối soát
                                </button>
                              )}
                              <button
                                onClick={() => handleRejectPayment(request.id)}
                                className="px-3 py-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 text-xs font-bold"
                              >
                                Từ chối
                              </button>
                              <button
                                onClick={() => handleApprovePayment(request.id)}
                                className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 text-xs font-bold"
                              >
                                Duyệt tay
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Đã xử lý</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* User Management Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
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
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
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
                      <tr key={user.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{user.email || 'N/A'}</span>
                            <span className="text-[10px] text-slate-400 font-mono tracking-tight">{user.uid}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 font-black text-primary">
                            <span className="material-symbols-outlined text-[18px] fill-icon text-yellow-500">token</span>
                            {user.isUnlimited ? '∞' : user.bpoints.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-600 dark:text-slate-400">{user.totalTranscriptions || 0} lần</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                             <button 
                              onClick={() => handleToggleUnlimited(user.uid, !!user.isUnlimited)}
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                                user.isUnlimited 
                                ? 'bg-purple-100 text-purple-700 border-purple-200' 
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-purple-50 hover:text-purple-600'
                              }`}
                            >
                              {user.isUnlimited ? 'Unlimited' : 'Standard'}
                            </button>
                            <button 
                              onClick={() => handleToggleAdmin(user.uid, !!user.isAdmin)}
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                                user.isAdmin 
                                ? 'bg-red-100 text-red-700 border-red-200' 
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-red-50 hover:text-red-600'
                              }`}
                            >
                              {user.isAdmin ? 'Admin' : 'User'}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => handleAdjustBpoints(user.uid, user.bpoints, -50)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              title="-50 Bpoint"
                            >
                              <span className="material-symbols-outlined text-sm">remove</span>
                            </button>
                            <button 
                              onClick={() => handleAdjustBpoints(user.uid, user.bpoints, -10)}
                              className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                              title="-10 Bpoint"
                            >
                              <span className="material-symbols-outlined text-sm">keyboard_arrow_left</span>
                            </button>
                            <span className="w-8 text-center text-xs font-bold">{user.bpoints}</span>
                            <button 
                              onClick={() => handleAdjustBpoints(user.uid, user.bpoints, 10)}
                              className="p-1.5 rounded-lg border border-green-100 text-green-500 hover:bg-green-50 transition-colors"
                              title="+10 Bpoint"
                            >
                              <span className="material-symbols-outlined text-sm">keyboard_arrow_right</span>
                            </button>
                            <button 
                              onClick={() => handleAdjustBpoints(user.uid, user.bpoints, 50)}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                              title="+50 Bpoint"
                            >
                              <span className="material-symbols-outlined text-sm">add</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
