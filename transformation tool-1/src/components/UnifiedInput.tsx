import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image as ImageIcon, FileSpreadsheet, FileJson, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { processInputFile } from '../lib/input-processor';
import type { UnifiedRecord } from '../lib/input-processor';

interface UnifiedInputProps {
  onDataReady: (data: UnifiedRecord[]) => void;
  onError?: (error: string) => void;
}

export const UnifiedInput: React.FC<UnifiedInputProps> = ({ onDataReady, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [textInput, setTextInput] = useState('');


  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    if (onError) onError(''); // Clear previous errors
    const allRecords: UnifiedRecord[] = [];

    try {
      for (const file of Array.from(files)) {
        const records = await processInputFile(file);
        allRecords.push(...records);
      }
      onDataReady(allRecords);
    } catch (error) {
      console.error('Error processing files:', error);
      const message = error instanceof Error ? error.message : 'Unknown error processing files';
      if (onError) {
        onError(message);
      } else {
        alert(message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      processFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
    }
  };



  const handleTextSubmit = () => {
    if (!textInput.trim()) return;

    // Attempt to parse as JSON first
    try {
      const json = JSON.parse(textInput);
      const items = Array.isArray(json) ? json : [json];
      const records: UnifiedRecord[] = items.map((item: any) => ({
        id: crypto.randomUUID(),
        group_id: '',
        topic: '',
        source_type: 'api',
        content_type: 'log',
        raw_content: JSON.stringify(item),
        structured_content: JSON.stringify(item),
        metadata: {
          timestamp: new Date().toISOString(),
          file_name: 'paste_input.json'
        },
        created_at: new Date().toISOString()
      }));
      onDataReady(records);
    } catch {
      // Treat as plain text
      const record: UnifiedRecord = {
        id: crypto.randomUUID(),
        group_id: '',
        topic: '',
        source_type: 'text',
        content_type: 'note',
        raw_content: textInput,
        structured_content: textInput,
        metadata: {
          timestamp: new Date().toISOString(),
          file_name: 'paste_input.txt'
        },
        created_at: new Date().toISOString()
      };
      onDataReady([record]);
    }
    setTextInput('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-black/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 transition-all duration-300">
      <div className="flex p-1 mb-8 bg-black/20 rounded-xl border border-white/5">
        <button
          onClick={() => setActiveTab('upload')}
          className={cn("flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200",
            activeTab === 'upload' ? "bg-white/10 text-white shadow-lg backdrop-blur-md ring-1 ring-white/5" : "text-slate-400 hover:text-white hover:bg-white/5")}
        >
          <Upload className="w-4 h-4" /> Upload Files
        </button>

        <button
          onClick={() => setActiveTab('text')}
          className={cn("flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200",
            activeTab === 'text' ? "bg-white/10 text-green-400 shadow-lg backdrop-blur-md ring-1 ring-white/5" : "text-slate-400 hover:text-white hover:bg-white/5")}
        >
          <FileText className="w-4 h-4" /> Paste Text/JSON
        </button>
      </div>

      <div className="min-h-[360px] flex flex-col justify-center relative">
        {activeTab === 'upload' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl transition-all duration-300 h-full group",
              isDragging ? "border-blue-400 bg-blue-500/10 scale-[0.99]" : "border-white/10 hover:border-blue-400/50 hover:bg-white/5",
              isProcessing && "opacity-50 pointer-events-none grayscale"
            )}
          >
            {isProcessing ? (
              <div className="text-center animate-in fade-in zoom-in duration-300">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                  <Loader2 className="w-16 h-16 text-blue-400 animate-spin relative z-10" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Processing Content</h4>
                <p className="text-slate-400">Extracting text, running OCR, and parsing structure...</p>
              </div>
            ) : (
              <>
                <div className="flex gap-4 mb-8 group-hover:scale-105 transition-transform duration-300">
                  <div className="p-4 bg-red-500/10 rounded-2xl text-red-400 shadow-sm border border-red-500/20 transform -rotate-6"><FileText className="w-8 h-8" /></div>
                  <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400 shadow-sm border border-blue-500/20 transform rotate-3 mt-2"><ImageIcon className="w-8 h-8" /></div>
                  <div className="p-4 bg-green-500/10 rounded-2xl text-green-400 shadow-sm border border-green-500/20 transform -rotate-3"><FileSpreadsheet className="w-8 h-8" /></div>
                  <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-400 shadow-sm border border-amber-500/20 transform rotate-6 mt-2"><FileJson className="w-8 h-8" /></div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Drag & Drop files here</h3>
                <p className="text-slate-400 mb-8 text-center max-w-md leading-relaxed">
                  Supports PDF, Images (OCR), Audio, Excel, CSV, JSON, and Text files.
                  <br />
                  <span className="text-sm font-medium text-slate-500 mt-2 block">Automatic extraction & structuring included.</span>
                </p>
                <label className="group/btn relative px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0">
                  <span className="font-bold tracking-wide">Browse Files</span>
                  <input type="file" className="hidden" multiple onChange={handleFileSelect} />
                </label>
              </>
            )}
          </div>
        )}



        {activeTab === 'text' && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="relative flex-1">
              <textarea
                className="w-full h-80 p-6 bg-black/20 border border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 resize-none font-mono text-sm text-slate-200 shadow-inner transition-all placeholder:text-slate-600"
                placeholder="Paste JSON logs, API responses, or plain text here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <div className="absolute top-4 right-4 text-xs font-medium text-slate-400 uppercase tracking-wider bg-white/10 px-2 py-1 rounded border border-white/10 shadow-sm backdrop-blur-sm">
                Raw Input
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                Process Content
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
