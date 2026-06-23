import { auth } from '../firebase';
import type { TranscriptionRecord } from '../types';

export interface TranscriptionResult {
  transcript: string;
  language?: string; 
  record?: TranscriptionRecord;
  durationMinutes?: number;
  bpointsConsumed?: number;
}

const handleApiError = (errorMessage: string, context: 'Gỡ băng' | 'Cấu trúc') => {
    const lowerCaseErrorMessage = errorMessage.toLowerCase();

    if (lowerCaseErrorMessage.includes("api key not valid") || lowerCaseErrorMessage.includes("permission_denied") || lowerCaseErrorMessage.includes("caller does not have permission")) {
        return `${context} thất bại: Khóa API Gemini không hợp lệ hoặc không có quyền truy cập. Vui lòng cấu hình GEMINI_API_KEY chính xác trên môi trường thiết lập.`;
    }
    if (lowerCaseErrorMessage.includes("quota")) {
         return `${context} thất bại do giới hạn quota API. Vui lòng thử lại sau hoặc kiểm tra tài khoản Gemini của bạn.`;
    }
    if (lowerCaseErrorMessage.includes("candidate was blocked due to safety")) {
        return `${context} thất bại: Nội dung có thể vi phạm chính sách an toàn.`;
    }
    if (lowerCaseErrorMessage.includes("invalid argument") || lowerCaseErrorMessage.includes("audio")) {
        return `${context} thất bại: Dữ liệu hoặc định dạng âm thanh không hợp lệ. Vui lòng đảm bảo âm thanh rõ ràng và ở định dạng được hỗ trợ.`;
    }
    if (lowerCaseErrorMessage.includes("readable")) {
        return `${context} thất bại: Lỗi tải lên trên trình duyệt này. Vui lòng thử lại trên trình duyệt khác.`;
    }
    
    return `${context} thất bại: ${errorMessage}`;
};

export const transcribeAudio = async (
  base64Audio: string,
  mimeType: string,
  fileName: string,
  durationMinutes: number
): Promise<TranscriptionResult> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Vui lòng đăng nhập để tiếp tục.");
    }

    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ base64Audio, mimeType, fileName, durationMinutes }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Gỡ băng thất bại.");
    }

    return {
      transcript: data.transcript,
      language: data.language,
      record: data.record,
      durationMinutes: data.durationMinutes,
      bpointsConsumed: data.bpointsConsumed,
    };
  } catch (error: any) {
    console.error("Lỗi gỡ băng âm thanh phía Client:", error);
    throw new Error(handleApiError(error?.message || "Không thể kết nối đến máy chủ.", 'Gỡ băng'));
  }
};

export const structureTranscript = async (originalTranscript: string, recordId?: string): Promise<string> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Vui lòng đăng nhập để tiếp tục.");
    }

    const response = await fetch("/api/structure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ transcript: originalTranscript, recordId }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Cấu trúc thất bại.");
    }

    return data.structuredTranscript;
  } catch (error: any) {
    console.error("Lỗi cấu trúc bản ghi phía Client:", error);
    throw new Error(handleApiError(error?.message || "Không thể kết nối đến máy chủ.", 'Cấu trúc'));
  }
};
