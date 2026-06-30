import { auth } from '../firebase';
import type { PaymentRequest } from '../types';

const getAuthToken = async () => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Vui lòng đăng nhập để tiếp tục.');
  }
  return token;
};

export const createPaymentRequest = async (
  packageId: string
): Promise<PaymentRequest> => {
  const token = await getAuthToken();
  const response = await fetch('/api/payment-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ packageId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Không thể tạo yêu cầu nạp Bpoint.');
  }

  return data.paymentRequest;
};

export const approvePaymentRequest = async (
  requestId: string,
  proof?: { bankReference?: string; evidenceNote?: string }
): Promise<void> => {
  const token = await getAuthToken();
  const response = await fetch(`/api/admin/payment-requests/${requestId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(proof || {}),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Không thể duyệt yêu cầu nạp.');
  }
};

export const reconcilePaymentRequest = async (requestId: string): Promise<PaymentRequest> => {
  const token = await getAuthToken();
  const response = await fetch(`/api/admin/payment-requests/${requestId}/reconcile`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Không thể đối soát giao dịch payOS.');
  }

  return data.paymentRequest;
};

export const rejectPaymentRequest = async (requestId: string, reason = ''): Promise<void> => {
  const token = await getAuthToken();
  const response = await fetch(`/api/admin/payment-requests/${requestId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Không thể từ chối yêu cầu nạp.');
  }
};
