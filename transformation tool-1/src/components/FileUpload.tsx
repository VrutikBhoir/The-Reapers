import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileType, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  error?: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing, error }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      setIsDragging(true);
    }
  }, [isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File) => {
    const validTypes = [
      'text/csv', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
      'application/json',
      'text/json' // sometimes json is text/json
    ];
    // Also check extensions because MIME types can be tricky (especially csv on Windows)
    const validExtensions = ['.csv', '.xlsx', '.json'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    return validTypes.includes(file.type) || validExtensions.includes(extension);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isProcessing) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        // Handle invalid file type in parent or local state? 
        // For now let's just alert or rely on the error prop from parent if we pass it up
        // But better to just call onFileSelect and let parent validate/error, OR check here.
        // User requirements say "Show clear error message".
        // I'll call onFileSelect, and let the parent handle the "Invalid format" error logic 
        // OR I can handle it locally. Let's handle it locally for immediate feedback if possible,
        // but the prop 'error' suggests parent controls state.
        // Actually, let's just pass it.
        onFileSelect(file);
      }
    }
  }, [onFileSelect, isProcessing]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // We might want to notify parent to clear state, but simple re-upload works too.
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ease-in-out flex flex-col items-center justify-center text-center cursor-pointer min-h-[200px]",
          isDragging ? "border-blue-400 bg-blue-500/10" : "border-white/10 hover:border-white/20 hover:bg-white/5",
          isProcessing ? "opacity-60 cursor-not-allowed" : "",
          error ? "border-red-400 bg-red-500/10" : ""
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".csv,.xlsx,.json"
          onChange={handleFileInput}
          disabled={isProcessing}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="bg-blue-500/20 p-4 rounded-full mb-4 relative">
              <FileType className="w-8 h-8 text-blue-400" />
              {isProcessing && (
                 <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">{selectedFile.name}</h3>
            <p className="text-sm text-slate-400 mb-4">{formatFileSize(selectedFile.size)}</p>
            
            {isProcessing ? (
               <div className="flex items-center gap-2 text-blue-400 font-medium">
                 <span>Processing ingestion layer...</span>
               </div>
            ) : (
              <div className="flex gap-3">
                 <button 
                   onClick={clearFile}
                   className="px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-2 border border-red-500/20"
                 >
                   <X className="w-4 h-4" />
                   Remove
                 </button>
                 <div className="px-4 py-2 text-sm font-medium text-green-400 bg-green-500/10 rounded-lg flex items-center gap-2 border border-green-500/20">
                   <CheckCircle className="w-4 h-4" />
                   Ready to analyze
                 </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={cn("p-4 rounded-full mb-4 transition-colors", isDragging ? "bg-blue-500/20" : "bg-white/5")}>
              <Upload className={cn("w-8 h-8", isDragging ? "text-blue-400" : "text-slate-400")} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {isDragging ? "Drop file here" : "Upload Data File"}
            </h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto mb-6">
              Drag and drop your file here, or click to browse.
              <br />
              <span className="text-xs mt-1 block text-slate-500">Supports CSV, XLSX, JSON</span>
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-300">
            <p className="font-medium text-red-200">Upload Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
