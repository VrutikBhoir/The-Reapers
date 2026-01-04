
export interface GeminiInferredConstraint {
  field: string;
  inferred_intent: string;
  expected_type: string;
  constraints: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
    custom_rule?: string;
  };
  confidence: number;
}

export interface GeminiValidationResult {
  row_index: number;
  field: string;
  value: any;
  status: 'error' | 'warning' | 'acceptable_anomaly';
  reason: string;
}

export interface DataTransformationAudit {
  rows_total: number;
  rows_altered: number;
  rows_unchanged: number;
  rows_deleted: number;
  values_corrected: number;
  values_normalized: number;
  nulls_filled: number;
  anomalies_flagged: number;
}

export interface StructuredDataQualityAssessment {
  score: number;
  improvements: string[];
  remaining_risks: string[];
  consistency_check: {
    status: 'pass' | 'fail' | 'warn';
    details: string;
  };
}

export interface GeminiAnalysisResult {
  ai_inferred_validation_rules: GeminiInferredConstraint[];
  ai_validation_results: GeminiValidationResult[];
  data_transformation_audit: DataTransformationAudit;
  structured_data_quality_assessment: StructuredDataQualityAssessment;
  natural_language_summary: string;
}
