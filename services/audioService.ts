
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // result is like "data:audio/mpeg;base64,actual_base64_string_here"
      // We need to strip the "data:mime/type;base64," part.
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const getMimeType = (fileName: string): string | null => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension) return null;

  switch (extension) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
      return 'audio/mp4'; // Common, can also be audio/x-m4a but audio/mp4 is widely accepted
    default:
      return null; // Let browser determine or use file.type
  }
};

export const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      resolve(0);
    };
  });
};
    