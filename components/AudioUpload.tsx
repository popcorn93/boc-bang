
import React, { useRef, useState, useCallback } from 'react';
import { UploadIcon, TranscribeIcon, MAX_FILE_SIZE_MB } from '../constants';

interface AudioUploadProps {
  onFileSelect: (file: File) => void;
  onTranscribe: () => void;
  isLoading: boolean;
  currentFile: File | null;
  hasAudioToTranscribe: boolean;
}

export const AudioUpload: React.FC<AudioUploadProps> = ({ 
  onFileSelect, 
  onTranscribe, 
  isLoading, 
  currentFile,
  hasAudioToTranscribe
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
     // Reset the input value to allow re-uploading the same file
    if(event.target) {
        event.target.value = '';
    }
  };

  const handleUploadClick = () => {
    if (!isLoading) {
        fileInputRef.current?.click();
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    handleDrag(e);
    if (!isLoading && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, [handleDrag, isLoading]);
  
  const handleDragOut = useCallback((e: React.DragEvent) => {
    handleDrag(e);
    setIsDragging(false);
  }, [handleDrag]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    handleDrag(e);
    setIsDragging(false);
    if (!isLoading && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [handleDrag, isLoading, onFileSelect]);


  return (
    <div className="mb-6 lg:mb-10">
      <div className="mb-6 lg:mb-10">
        <h2 className="text-2xl lg:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">Tải lên tập tin</h2>
        <p className="text-slate-500 dark:text-slate-400 text-base lg:text-lg">Kéo và thả hoặc chọn tệp âm thanh để bắt đầu chuyển đổi văn bản với AI.</p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
        className="hidden"
        disabled={isLoading}
      />
      
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleUploadClick}
        className={`bg-white dark:bg-background-dark/50 border-2 border-dashed rounded-xl p-8 lg:p-16 flex flex-col items-center justify-center text-center gap-4 lg:gap-6 shadow-sm transition-all group cursor-pointer
          ${isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-primary/20 hover:border-primary/40'
          }
          ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}
        `}
        aria-disabled={isLoading}
      >
        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-primary/5 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-primary text-4xl lg:text-5xl">cloud_upload</span>
        </div>
        <div className="max-w-md">
          <h3 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {currentFile ? currentFile.name : 'Kéo và thả tệp vào đây'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm lg:text-base leading-relaxed">
            {currentFile 
              ? `(${(currentFile.size / (1024 * 1024)).toFixed(2)} MB)` 
              : `Hỗ trợ định dạng âm thanh phổ biến như MP3, WAV, M4A, FLAC. Dung lượng tối đa ${MAX_FILE_SIZE_MB}MB cho mỗi tệp.`
            }
          </p>
        </div>
        <button 
          className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 lg:px-10 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center gap-2 text-sm lg:text-base"
          onClick={(e) => {
            e.stopPropagation();
            handleUploadClick();
          }}
          disabled={isLoading}
        >
          <span className="material-symbols-outlined text-xl">upload_file</span>
          {currentFile ? 'Chọn tệp khác' : 'Chọn tệp từ máy tính'}
        </button>
      </div>

      {hasAudioToTranscribe && !isLoading && (
        <div className="mt-6 lg:mt-8 flex justify-center">
          <button
            onClick={onTranscribe}
            className="w-full lg:w-auto bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 lg:px-12 rounded-xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 text-base lg:text-lg hover:scale-105"
          >
            <span className="material-symbols-outlined text-2xl">graphic_eq</span>
            Bắt đầu gỡ băng ngay
          </button>
        </div>
      )}
    </div>
  );
};
