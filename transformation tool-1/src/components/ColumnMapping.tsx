import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import type { MappingResult, DomainSchema, ColumnAnalysis, SemanticType, SemanticMapping } from '../types';

interface ColumnMappingProps {
  columns: ColumnAnalysis[];
  initialMapping: MappingResult;
  targetSchema?: DomainSchema;
  onConfirm: (finalMapping: Record<string, string>, semanticMapping: SemanticMapping) => void;
  onBack: () => void;
}

const SEMANTIC_TYPES: SemanticType[] = [
  'identifier',
  'name',
  'date',
  'numeric_amount',
  'contact_info',
  'categorical',
  'boolean_flag',
  'free_text'
];

export const ColumnMapping: React.FC<ColumnMappingProps> = ({ 
  columns, 
  initialMapping, 
  targetSchema: _targetSchema, 
  onConfirm,
  onBack
}) => {
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [semanticTypes, setSemanticTypes] = useState<SemanticMapping>({});

  useEffect(() => {
    // Initialize state from initialMapping and inference
    const newMappings: Record<string, string | null> = {};
    const newSemanticTypes: SemanticMapping = {};

    columns.forEach(col => {
      // 1. Name Mapping
      if (initialMapping.mapped_columns[col.name]) {
        newMappings[col.name] = initialMapping.mapped_columns[col.name];
      } else {
        newMappings[col.name] = col.name; // Default to self
      }

      // 2. Semantic Type Inference
      let inferredType: SemanticType = 'free_text';
      
      const lowerName = col.name.toLowerCase();
      const basicType = col.type; // 'String' | 'Integer' | 'Float' | 'Date' | 'Boolean'

      if (basicType === 'Boolean') {
        inferredType = 'boolean_flag';
      } else if (basicType === 'Date') {
        inferredType = 'date';
      } else if (basicType === 'Integer' || basicType === 'Float') {
        inferredType = 'numeric_amount';
      } else {
        // Heuristic inference based on name for Strings
        if (lowerName.includes('id') || lowerName.endsWith('_key') || lowerName === 'code') {
          inferredType = 'identifier';
        } else if (lowerName.includes('email') || lowerName.includes('phone') || lowerName.includes('contact')) {
          inferredType = 'contact_info';
        } else if (lowerName.includes('name') || lowerName.includes('first') || lowerName.includes('last')) {
          inferredType = 'name';
        } else if (lowerName.includes('status') || lowerName.includes('category') || lowerName.includes('type')) {
          inferredType = 'categorical';
        }
      }
      
      newSemanticTypes[col.name] = inferredType;
    });

    setMappings(newMappings);
    setSemanticTypes(newSemanticTypes);
  }, [initialMapping, columns]);

  const handleMappingChange = (originalCol: string, newValue: string) => {
    setMappings(prev => ({ ...prev, [originalCol]: newValue }));
  };

  const handleSemanticTypeChange = (originalCol: string, newType: SemanticType) => {
    setSemanticTypes(prev => ({ ...prev, [originalCol]: newType }));
  };

  // Validation: Ensure all columns have a target name
  const isValid = columns.every(col => mappings[col.name] && mappings[col.name]!.trim() !== '');

  const handleConfirm = () => {
    if (isValid) {
      const finalMapping: Record<string, string> = {};
      Object.entries(mappings).forEach(([orig, canon]) => {
        if (canon) {
          finalMapping[orig] = canon;
        }
      });
      onConfirm(finalMapping, semanticTypes);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-xl font-bold text-white">Column Mapping & Types</h2>
           <p className="text-slate-400 text-sm mt-1">
             Verify target field names and confirm semantic data types.
           </p>
        </div>
        <div className="text-right">
             <div className="text-sm font-medium text-slate-300">
                 {Object.values(mappings).filter(Boolean).length} / {columns.length} Columns Mapped
             </div>
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-md rounded-xl shadow-sm border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-400 font-medium border-b border-white/10">
              <tr>
                <th className="px-6 py-4 w-1/4">Source Column</th>
                <th className="px-6 py-4 w-8"></th>
                <th className="px-6 py-4 w-1/4">Target Field</th>
                <th className="px-6 py-4 w-1/4">Semantic Type</th>
                <th className="px-6 py-4 w-1/6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {columns.map((col) => {
                const originalName = col.name;
                const mappedId = mappings[originalName];
                const semanticType = semanticTypes[originalName];
                
                return (
                  <tr key={originalName} className={cn("hover:bg-white/5 transition-colors", !mappedId ? "bg-orange-500/10" : "")}>
                    <td className="px-6 py-4 font-medium text-slate-200">
                        {originalName}
                        <div className="text-xs text-slate-400 font-normal mt-0.5">
                            Detected: {col.type}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500">
                        <ArrowRight className="w-4 h-4 mx-auto" />
                    </td>
                    <td className="px-6 py-4">
                        <input 
                            type="text"
                            className={cn(
                                "w-full rounded-lg bg-black/20 border-white/10 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-600",
                                !mappedId && "text-slate-400 border-dashed border-slate-600"
                            )}
                            value={mappedId || ""}
                            onChange={(e) => handleMappingChange(originalName, e.target.value)}
                            placeholder="Enter target field name"
                        />
                    </td>
                    <td className="px-6 py-4">
                        <select
                            className="w-full rounded-lg bg-black/20 border-white/10 text-sm text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={semanticType || 'free_text'}
                            onChange={(e) => handleSemanticTypeChange(originalName, e.target.value as SemanticType)}
                        >
                            {SEMANTIC_TYPES.map(type => (
                                <option key={type} value={type} className="bg-slate-900 text-slate-300">
                                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </option>
                            ))}
                        </select>
                    </td>
                    <td className="px-6 py-4">
                        {mappedId ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/20">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Ready
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/20">
                                <HelpCircle className="w-3.5 h-3.5" />
                                Missing Target
                            </span>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 backdrop-blur-sm transition-all"
        >
            Back to Analysis
        </button>
        <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={cn(
                "px-6 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all",
                isValid 
                    ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 hover:-translate-y-0.5" 
                    : "bg-slate-700/50 text-slate-500 cursor-not-allowed border border-white/5"
            )}
        >
            Confirm Mapping
        </button>
      </div>
    </div>
  );
};
