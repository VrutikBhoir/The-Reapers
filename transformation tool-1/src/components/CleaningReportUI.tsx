import React, { useState } from 'react';
import { Download, CheckCircle, Activity, Filter, Trash2, Calendar, Phone, Mail, User, RefreshCw } from 'lucide-react';
import type { CleaningReport } from '../types';
import * as XLSX from 'xlsx';

interface CleaningReportUIProps {
  report: CleaningReport;
  onRestart: () => void;
}

export const CleaningReportUI: React.FC<CleaningReportUIProps> = ({ report, onRestart }) => {
  const { stats, cleaned_data } = report;
  const [showPreview, setShowPreview] = useState(false);

  const handleDownload = () => {
    const ws = XLSX.utils.json_to_sheet(cleaned_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cleaned Data");
    XLSX.writeFile(wb, "cleaned_data.xlsx");
  };

  const getIconForKey = (key: string) => {
    if (key.includes('email')) return Mail;
    if (key.includes('phone')) return Phone;
    if (key.includes('date')) return Calendar;
    if (key.includes('name')) return User;
    if (key.includes('numeric') || key.includes('salary') || key.includes('age')) return Activity;
    if (key.includes('boolean') || key.includes('active')) return CheckCircle;
    if (key.includes('trimmed')) return Filter;
    return RefreshCw;
  };

  const formatLabel = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) => (
    <div className="bg-black/20 p-5 rounded-xl border border-white/10 shadow-sm flex items-center space-x-5 hover:bg-black/30 transition-all group backdrop-blur-sm">
      <div className={`p-4 rounded-xl ${color.replace('bg-', 'bg-opacity-20 bg-')} text-${color.replace('bg-', '')}-400 transition-colors`}>
        <Icon className={`w-7 h-7`} />
      </div>
      <div>
        <p className="text-sm text-slate-400 font-medium tracking-wide uppercase">{label}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
                <Activity className="w-6 h-6 text-purple-400" />
            </div>
            Cleaning Results
          </h2>
          <p className="text-slate-400 mt-2 text-lg">Automated data cleaning and standardization report</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRestart}
            className="px-5 py-2.5 text-slate-300 hover:text-white font-medium flex items-center gap-2 border border-white/10 rounded-lg hover:bg-white/10 transition-colors backdrop-blur-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Start Over
          </button>
          <button
            onClick={handleDownload}
            className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2 hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            Download Cleaned Data
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Input Records" 
          value={stats.initial_records} 
          icon={Filter} 
          color="bg-blue-500" 
        />
        <StatCard 
          label="Cleaned Records" 
          value={stats.records_after_cleaning} 
          icon={CheckCircle} 
          color="bg-green-500" 
        />
        <StatCard 
          label="Dropped Records" 
          value={stats.dropped_records} 
          icon={Trash2} 
          color="bg-red-500" 
        />
        <StatCard 
          label="Transformations" 
          value={Object.values(stats.fixes_applied).reduce((a, b) => a + b, 0)} 
          icon={RefreshCw} 
          color="bg-purple-500" 
        />
      </div>

      {/* Fixes Breakdown */}
      <div className="bg-black/40 rounded-2xl border border-white/10 shadow-sm overflow-hidden backdrop-blur-md">
        <div className="px-8 py-5 border-b border-white/10 bg-black/20">
          <h3 className="font-bold text-white text-lg">Applied Fixes Breakdown</h3>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(stats.fixes_applied).length > 0 ? (
            Object.entries(stats.fixes_applied).map(([key, count]) => (
                <FixItem 
                    key={key} 
                    label={formatLabel(key)} 
                    count={count} 
                    icon={getIconForKey(key)} 
                />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                    <CheckCircle className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-400 font-medium">No transformations were needed.</p>
                <p className="text-sm text-slate-500 mt-1">Your data was already clean!</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-black/40 rounded-2xl border border-white/10 shadow-sm overflow-hidden backdrop-blur-md">
        <div className="px-8 py-5 border-b border-white/10 flex justify-between items-center bg-black/20">
          <h3 className="font-bold text-white text-lg">Cleaned Data Preview</h3>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-purple-400 hover:text-purple-300 font-bold hover:underline decoration-2 underline-offset-4"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
        
        {showPreview && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="bg-black/40 text-slate-400 uppercase font-semibold text-xs tracking-wider">
                <tr>
                  {Object.keys(cleaned_data[0] || {}).map(key => (
                    <th key={key} className="px-8 py-4 border-b border-white/10 whitespace-nowrap bg-black/40 sticky top-0">
                      {key.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {cleaned_data.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    {Object.values(row).map((val: any, i) => (
                      <td key={i} className="px-8 py-4 whitespace-nowrap max-w-xs truncate">
                        {val === null ? (
                            <span className="text-slate-500 italic text-xs bg-white/5 px-2 py-1 rounded">null</span>
                        ) : typeof val === 'object' ? (
                            <span className="font-mono text-xs text-slate-400 bg-white/5 px-2 py-1 rounded" title={JSON.stringify(val, null, 2)}>
                                {JSON.stringify(val).slice(0, 30) + (JSON.stringify(val).length > 30 ? '...' : '')}
                            </span>
                        ) : (
                            <span className="text-slate-300">
                                {String(val).length > 50 ? String(val).slice(0, 50) + '...' : String(val)}
                            </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-8 py-4 bg-black/40 text-xs text-slate-500 text-center border-t border-white/10 font-medium uppercase tracking-wide">
              Showing first 10 rows of {cleaned_data.length} records
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FixItem = ({ label, count, icon: Icon }: { label: string, count: number, icon: any }) => (
  <div className="flex items-center space-x-4 p-4 bg-black/20 rounded-xl border border-white/10 hover:bg-black/30 transition-colors group">
    <div className="p-2.5 bg-white/5 rounded-lg shadow-sm text-slate-400 group-hover:text-purple-400 transition-colors">
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1">
      <p className="text-sm text-slate-400 font-medium">{label}</p>
      <p className="text-xl font-bold text-white">{count}</p>
    </div>
  </div>
);
