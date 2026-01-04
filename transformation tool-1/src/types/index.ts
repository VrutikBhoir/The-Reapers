export interface ColumnAnalysis {
  name: string;
  type: string;
  nullPercentage: number;
  sampleValues?: any[];
}

export interface IngestionMetadata {
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'xlsx' | 'json';
  totalRows: number;
  totalColumns: number;
  uploadTimestamp: string;
  encoding?: string;
  source: 'manual';
}

export interface AnalysisResult {
  metadata: IngestionMetadata;
  columns: ColumnAnalysis[];
}

export interface CanonicalField {
  id: string;
  label: string;
  required: boolean;
  type: string;
  aliases: string[];
  unique?: boolean;
  description?: string;
}

export interface ColumnMapping {
  originalColumn: string;
  canonicalField: string | null;
  confidence: number;
  isIgnored: boolean;
}

export interface MappingResult {
  detected_columns: string[];
  mapped_columns: Record<string, string>;
  unknown_columns: string[];
  missing_schema_fields: string[];
}

export interface DomainSchema {
  id: string;
  name: string;
  fields: CanonicalField[];
}

export interface SchemaRegistry {
  [key: string]: DomainSchema;
}

export type SemanticType =
  | 'identifier'
  | 'name'
  | 'date'
  | 'numeric_amount'
  | 'contact_info'
  | 'categorical'
  | 'boolean_flag'
  | 'free_text';

export type SemanticMapping = Record<string, SemanticType>;

export type SeverityLevel = 'info' | 'warning' | 'critical';

export interface ValidationIssue {
  row: number;
  column: string;
  value: any;
  message: string;
  severity: SeverityLevel;
  type: 'type' | 'format' | 'range' | 'required' | 'duplicate' | 'consistency' | 'encoding' | 'other';
}

export interface FieldValidationResult {
  field: string;
  total_values: number;
  valid_values: number;
  invalid_values: number;
  missing_values: number; // Changed from null_values for clarity
  quality_score: number; // 0-100
  failed_checks: string[];
  severity_counts: {
    critical: number;
    warning: number;
    info: number;
  };
}

export interface ValidationReport {
  dataset_quality_score: number; // 0-100
  total_records: number;
  processed_records: number;
  error_count: number;
  warning_count: number;
  validation_status: 'pass' | 'warn' | 'fail';
  field_validation_results: Record<string, FieldValidationResult>;
  issues: ValidationIssue[]; // Sample of issues
}

export interface CleaningStats {
  initial_records: number;
  records_after_validation: number;
  records_after_cleaning: number;
  records_with_critical_errors: number;
  records_with_warnings: number;
  dropped_records: number;
  fixes_applied: Record<string, number>;
}

export * from './gemini';

export interface CleaningReport {
  stats: CleaningStats;
  cleaned_data: any[];
  dropped_rows: number[]; // Row indices
}
