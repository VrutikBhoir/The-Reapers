import React from 'react';
import type { AnalysisResult } from '../types';
import { Clock, Database, FileText, Hash } from 'lucide-react';

interface MetadataPanelProps {
  data: AnalysisResult;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ data }) => {
  return (
    <div className="bg-black/40 backdrop-blur-md rounded-xl shadow-sm border border-white/10 p-6 h-fit sticky top-24">
      <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Ingestion Metadata</h3>
      
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Upload Timestamp</p>
            <p className="text-sm text-slate-200 mt-0.5">
                {new Date(data.metadata.uploadTimestamp).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/20">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Source</p>
            <p className="text-sm text-slate-200 mt-0.5 capitalize">{data.metadata.source}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">File Format</p>
            <p className="text-sm text-slate-200 mt-0.5 uppercase">{data.metadata.fileType}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/20">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Records</p>
            <p className="text-sm text-slate-200 mt-0.5">{data.metadata.totalRows.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white/10">
          <div className="text-xs text-slate-500">
              Session ID: <span className="font-mono text-slate-400">ING-{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
          </div>
      </div>
    </div>
  );
};
