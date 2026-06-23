
import React from 'react';

export interface UserProfile {
  uid: string;
  email: string;
  bpoints: number;
  totalTranscriptions: number;
  isUnlimited?: boolean;
  isAdmin?: boolean;
}

export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentRequest {
  id: string;
  userId: string;
  email: string;
  points: number;
  price: number;
  packageId?: string;
  transferNote?: string;
  status: PaymentRequestStatus;
  createdAt?: any;
  updatedAt?: any;
  approvedAt?: any;
  approvedBy?: string;
  rejectedAt?: any;
  rejectedBy?: string;
  rejectionReason?: string;
}

export interface TranscriptionRecord {
  id: string;
  userId: string;
  fileName: string;
  date: any; 
  transcript: string;
  language?: string;
  structuredTranscript?: string | null;
  durationMinutes?: number;
  bpointsConsumed?: number;
}

export interface AppState {
  currentFile: File | null;
  base64Audio: string | null;
  audioMimeType: string | null;
  transcript: string;
  isLoading: boolean;
  error: string | null;
  history: TranscriptionRecord[];
}

export interface ModalContent {
  title: string;
  message: string | React.ReactNode;
}
