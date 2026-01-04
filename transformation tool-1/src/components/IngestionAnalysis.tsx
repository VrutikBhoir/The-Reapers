import React from 'react';
import type { AnalysisResult } from '../types';

interface IngestionAnalysisProps {
  data: AnalysisResult;
}

export const IngestionAnalysis: React.FC<IngestionAnalysisProps> = ({ data }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Ingestion Layer Analysis</h2>
        <div className="flex gap-2">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full uppercase border border-blue-500/20">
                {data.metadata.fileType}
            </span>
             <span className="px-3 py-1 bg-white/10 text-slate-300 text-xs font-medium rounded-full border border-white/10">
                {data.metadata.encoding || 'UTF-8'}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white/10">
            <p className="text-sm text-slate-400 font-medium">Total Rows</p>
            <p className="text-2xl font-bold text-white mt-1">{data.metadata.totalRows.toLocaleString()}</p>
        </div>
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white/10">
            <p className="text-sm text-slate-400 font-medium">Total Columns</p>
            <p className="text-2xl font-bold text-white mt-1">{data.metadata.totalColumns.toLocaleString()}</p>
        </div>
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white/10">
             <p className="text-sm text-slate-400 font-medium">File Size</p>
            <p className="text-2xl font-bold text-white mt-1">
                {(data.metadata.fileSize / 1024).toFixed(1)} KB
            </p>
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-md rounded-xl shadow-sm border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 bg-black/20">
            <h3 className="text-sm font-semibold text-white">Schema Detection</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-400 font-medium border-b border-white/10">
              <tr>
                <th className="px-6 py-3">Column Name</th>
                <th className="px-6 py-3">Detected Type</th>
                <th className="px-6 py-3">Null %</th>
                <th className="px-6 py-3">Sample Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.columns.map((col, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-200">{col.name}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                        col.type === 'Integer' || col.type === 'Float' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' :
                        col.type === 'Date' || col.type === 'DateTime' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' :
                        col.type === 'Boolean' ? 'bg-amber-500/20 text-amber-400 border-amber-500/20' :
                        'bg-white/10 text-slate-300 border-white/10'
                    }`}>
                      {col.type}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${col.nullPercentage > 0 ? 'bg-orange-400' : 'bg-slate-500'}`} 
                                style={{ width: `${Math.min(col.nullPercentage, 100)}%` }}
                            ></div>
                        </div>
                        <span className={`text-xs ${col.nullPercentage > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                            {col.nullPercentage.toFixed(1)}%
                        </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-400 font-mono text-xs truncate max-w-[150px]">
                      {col.sampleValues && col.sampleValues.length > 0 ? String(col.sampleValues[0]) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
