import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, FileDown, Activity, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import type { ValidationReport } from '../types';
import { cn } from '../lib/utils';

interface ValidationReportUIProps {
  report: ValidationReport;
  onProceed: () => void;
  onBack: () => void;
}

export const ValidationReportUI: React.FC<ValidationReportUIProps> = ({ report, onProceed, onBack }) => {
  const [showIssues, setShowIssues] = useState(true);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-500/20';
    if (score >= 70) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  const getStatusIcon = (status: 'pass' | 'warn' | 'fail') => {
      switch (status) {
          case 'pass': return <ShieldCheck className="w-8 h-8 text-green-400" />;
          case 'warn': return <ShieldAlert className="w-8 h-8 text-yellow-400" />;
          case 'fail': return <ShieldX className="w-8 h-8 text-red-400" />;
      }
  };

  const filteredIssues = selectedField 
    ? report.issues.filter(i => i.column === selectedField)
    : report.issues;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-xl font-bold text-white">Validation Results</h2>
           <p className="text-slate-400 text-sm mt-1">
             Comprehensive data quality assessment based on semantic rules.
           </p>
        </div>
        <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm">
                <FileDown className="w-4 h-4" />
                Export Report
            </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-black/40 backdrop-blur-md p-5 rounded-xl shadow-sm border border-white/10 col-span-1 md:col-span-2 flex items-center gap-6">
              <div className="flex-1">
                <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Dataset Quality Score</p>
                <div className="flex items-end gap-2 mt-1">
                    <span className={cn("text-4xl font-bold", getScoreColor(report.dataset_quality_score))}>
                        {report.dataset_quality_score}
                    </span>
                    <span className="text-sm text-slate-500 mb-2">/ 100</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                    <div 
                        className={cn("h-full rounded-full transition-all duration-1000", getScoreColor(report.dataset_quality_score).replace('text-', 'bg-'))} 
                        style={{ width: `${report.dataset_quality_score}%` }}
                    ></div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center pl-6 border-l border-white/10">
                  {getStatusIcon(report.validation_status)}
                  <span className="text-sm font-bold uppercase mt-2 text-slate-400">{report.validation_status}</span>
              </div>
          </div>

          <div className="bg-black/40 backdrop-blur-md p-5 rounded-xl shadow-sm border border-white/10">
              <p className="text-sm text-slate-400 font-medium">Records Processed</p>
              <div className="mt-2">
                  <span className="text-2xl font-bold text-white">{report.total_records.toLocaleString()}</span>
              </div>
              <div className="mt-2 flex gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full font-medium border border-red-500/20">{report.error_count} Errors</span>
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full font-medium border border-yellow-500/20">{report.warning_count} Warnings</span>
              </div>
          </div>

          <div className="bg-black/40 backdrop-blur-md p-5 rounded-xl shadow-sm border border-white/10">
               <p className="text-sm text-slate-400 font-medium">Fields Analyzed</p>
               <div className="mt-2">
                   <span className="text-2xl font-bold text-white">{Object.keys(report.field_validation_results).length}</span>
               </div>
               <p className="text-xs text-slate-500 mt-2">
                   Across {report.processed_records} rows
               </p>
          </div>
      </div>

      {/* Field Quality Breakdown */}
      <div className="bg-black/40 backdrop-blur-md rounded-xl shadow-sm border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 bg-black/20">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Field Quality Breakdown
            </h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-400 font-medium border-b border-white/10">
                    <tr>
                        <th className="px-6 py-3">Field Name</th>
                        <th className="px-6 py-3">Quality Score</th>
                        <th className="px-6 py-3">Valid</th>
                        <th className="px-6 py-3">Invalid</th>
                        <th className="px-6 py-3">Null</th>
                        <th className="px-6 py-3">Key Issues</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {Object.values(report.field_validation_results).map((fieldResult) => (
                        <tr 
                            key={fieldResult.field} 
                            className={cn(
                                "hover:bg-white/5 cursor-pointer transition-colors",
                                selectedField === fieldResult.field && "bg-blue-500/10"
                            )}
                            onClick={() => setSelectedField(selectedField === fieldResult.field ? null : fieldResult.field)}
                        >
                            <td className="px-6 py-3 font-medium text-slate-200">{fieldResult.field}</td>
                            <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className={cn("h-full rounded-full", getScoreBg(fieldResult.quality_score).replace('bg-', 'bg-').replace('100', '500').replace('/20', ''))} 
                                            style={{ width: `${fieldResult.quality_score}%` }}
                                        ></div>
                                    </div>
                                    <span className={cn("text-xs font-bold", getScoreColor(fieldResult.quality_score))}>
                                        {fieldResult.quality_score}%
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-3 text-green-400">{fieldResult.valid_values}</td>
                            <td className="px-6 py-3 text-red-400 font-medium">
                                {fieldResult.invalid_values > 0 ? fieldResult.invalid_values : <span className="text-slate-600">-</span>}
                            </td>
                            <td className="px-6 py-3 text-slate-400">
                                {fieldResult.null_values > 0 ? fieldResult.null_values : <span className="text-slate-600">-</span>}
                            </td>
                            <td className="px-6 py-3">
                                <div className="flex flex-wrap gap-1">
                                    {fieldResult.failed_checks.length > 0 ? (
                                        fieldResult.failed_checks.slice(0, 2).map(check => (
                                            <span key={check} className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] uppercase font-bold border border-red-500/20">
                                                {check}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-slate-600 text-xs italic">None</span>
                                    )}
                                    {fieldResult.failed_checks.length > 2 && (
                                        <span className="text-[10px] text-slate-500 px-1">+{fieldResult.failed_checks.length - 2}</span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Issues Log */}
      <div className="bg-black/40 backdrop-blur-md rounded-xl shadow-sm border border-white/10 overflow-hidden">
        <div 
            className="px-6 py-4 border-b border-white/10 bg-black/20 flex justify-between items-center cursor-pointer"
            onClick={() => setShowIssues(!showIssues)}
        >
            <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <h3 className="text-sm font-semibold text-white">
                    {selectedField ? `Issues for "${selectedField}"` : "Issue Log"}
                </h3>
                <span className="px-2 py-0.5 bg-white/10 text-slate-300 text-xs rounded-full font-medium">
                    {filteredIssues.length} issues
                </span>
            </div>
            {showIssues ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
        </div>

        {showIssues && (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                    <thead className="bg-black/40 text-slate-400 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th className="px-6 py-2 font-medium w-20">Row</th>
                            <th className="px-6 py-2 font-medium w-48">Column</th>
                            <th className="px-6 py-2 font-medium w-48">Value</th>
                            <th className="px-6 py-2 font-medium">Issue</th>
                            <th className="px-6 py-2 font-medium w-24">Type</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {filteredIssues.length > 0 ? (
                            filteredIssues.map((issue, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-2 text-slate-500 font-mono text-xs">{issue.row}</td>
                                    <td className="px-6 py-2 font-medium text-slate-300">{issue.column}</td>
                                    <td className="px-6 py-2 text-slate-400 font-mono text-xs truncate max-w-[200px]" title={String(issue.value)}>
                                        {String(issue.value ?? 'null')}
                                    </td>
                                    <td className={cn("px-6 py-2 text-xs", issue.severity === 'error' ? 'text-red-400' : 'text-orange-400')}>
                                        {issue.message}
                                    </td>
                                    <td className="px-6 py-2">
                                        <span className="px-2 py-0.5 bg-white/5 text-slate-400 rounded text-[10px] uppercase font-medium border border-white/5">
                                            {issue.type}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                                    No issues found for this selection.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 backdrop-blur-sm transition-all"
        >
            Back to Mapping
        </button>
        
        <div className="flex items-center gap-4">
             {report.validation_status !== 'pass' && (
                 <span className="text-xs text-orange-400 font-medium flex items-center gap-1">
                     <AlertTriangle className="w-3 h-3" /> Proceeding with quality warnings
                 </span>
             )}
            <button
                onClick={onProceed}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all hover:-translate-y-0.5"
            >
                Proceed to Cleaning
            </button>
        </div>
      </div>
    </div>
  );
};
