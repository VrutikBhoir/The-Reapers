
import React from 'react';
import type { GeminiAnalysisResult } from '../types/gemini';
import { CheckCircle, FileText, Activity, BrainCircuit } from 'lucide-react';

interface GeminiInsightsUIProps {
  result: GeminiAnalysisResult;
}

export const GeminiInsightsUI: React.FC<GeminiInsightsUIProps> = ({ result }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Natural Language Summary */}
      <div className="bg-gradient-to-r from-indigo-900/20 to-blue-900/20 border border-indigo-500/20 rounded-xl p-6 shadow-sm backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/10 rounded-lg shadow-sm text-indigo-400 backdrop-blur-md">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-2">AI Transformation Insights</h3>
            <p className="text-slate-300 leading-relaxed text-sm md:text-base">
              {result.natural_language_summary}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Transformation Audit */}
        <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">Transformation Audit</h3>
          </div>
          
          <div className="space-y-3">
            <AuditRow label="Total Rows" value={result.data_transformation_audit.rows_total} />
            <AuditRow label="Rows Altered" value={result.data_transformation_audit.rows_altered} highlight />
            <AuditRow label="Rows Unchanged" value={result.data_transformation_audit.rows_unchanged} />
            <AuditRow label="Rows Deleted" value={result.data_transformation_audit.rows_deleted} color="text-red-400" />
            <div className="border-t border-white/10 my-2 pt-2">
                <AuditRow label="Values Corrected" value={result.data_transformation_audit.values_corrected} color="text-green-400" />
                <AuditRow label="Nulls Filled" value={result.data_transformation_audit.nulls_filled} color="text-blue-400" />
                <AuditRow label="Anomalies Flagged" value={result.data_transformation_audit.anomalies_flagged} color="text-amber-400" />
            </div>
          </div>
        </div>

        {/* Quality Assessment */}
        <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold text-white">Structured Quality Check</h3>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-4 border-green-500/20 text-green-400 font-bold text-xl">
              {result.structured_data_quality_assessment.score}
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium uppercase tracking-wide">Quality Score</p>
              <p className="text-xs text-slate-500">AI Evaluated</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Improvements</p>
              <ul className="space-y-1">
                {result.structured_data_quality_assessment.improvements.map((item, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            
            {result.structured_data_quality_assessment.remaining_risks.length > 0 && (
                <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Remaining Risks</p>
                <ul className="space-y-1">
                    {result.structured_data_quality_assessment.remaining_risks.map((item, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span> {item}
                    </li>
                    ))}
                </ul>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Inferred Rules */}
      <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">AI Inferred Validation Rules</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/20">
                {result.ai_inferred_validation_rules.length} Rules Generated
            </span>
        </div>
        <div className="divide-y divide-white/10">
          {result.ai_inferred_validation_rules.map((rule, idx) => (
            <div key={idx} className="p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200">{rule.field}</span>
                    <span className="text-xs px-2 py-0.5 bg-white/5 text-slate-400 rounded border border-white/10">
                        {rule.inferred_intent}
                    </span>
                </div>
                <span className="text-xs text-slate-500">Confidence: {(rule.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="text-sm text-slate-400 grid grid-cols-2 gap-4">
                 <div>
                    <span className="text-slate-500 text-xs uppercase mr-2">Type</span>
                    {rule.expected_type}
                 </div>
                 <div>
                    <span className="text-slate-500 text-xs uppercase mr-2">Constraints</span>
                    {JSON.stringify(rule.constraints)
                        .replace(/{|}|"/g, '')
                        .replace(/,/g, ', ')}
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AuditRow: React.FC<{ label: string; value: number; color?: string; highlight?: boolean }> = ({ label, value, color = "text-white", highlight }) => (
    <div className={`flex justify-between items-center py-1 ${highlight ? 'bg-blue-500/10 px-2 rounded -mx-2' : ''}`}>
        <span className="text-sm text-slate-400">{label}</span>
        <span className={`font-mono font-medium ${color}`}>{value.toLocaleString()}</span>
    </div>
);
