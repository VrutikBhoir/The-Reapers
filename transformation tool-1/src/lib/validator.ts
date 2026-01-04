import type { ValidationReport, ValidationIssue, SemanticMapping, FieldValidationResult } from '../types';

export const validateData = (
  data: any[],
  semanticMapping: SemanticMapping
): ValidationReport => {
  const issues: ValidationIssue[] = [];
  const fieldResults: Record<string, FieldValidationResult> = {};
  
  const columns = Object.keys(semanticMapping);
  
  // Initialize field results
  columns.forEach(col => {
    fieldResults[col] = {
      field: col,
      total_values: 0,
      valid_values: 0,
      invalid_values: 0,
      null_values: 0,
      quality_score: 100,
      failed_checks: []
    };
  });

  // Helper for numeric analysis (outlier detection)
  const numericValues: Record<string, number[]> = {};
  
  // Helper for uniqueness
  const uniqueSets: Record<string, Set<any>> = {};
  
  // Helper for categorical analysis
  const categoricalValues: Record<string, Set<string>> = {};

  columns.forEach(col => {
    if (semanticMapping[col] === 'numeric_amount') numericValues[col] = [];
    if (semanticMapping[col] === 'identifier') uniqueSets[col] = new Set();
    if (semanticMapping[col] === 'categorical') categoricalValues[col] = new Set();
  });

  let errorCount = 0;
  let warningCount = 0;

  // 1. Value-Level Validation
  data.forEach((row, rowIndex) => {
    columns.forEach(col => {
      const value = row[col];
      const type = semanticMapping[col];
      const result = fieldResults[col];
      
      result.total_values++;

      // Null check
      if (value === null || value === undefined || value === '') {
        result.null_values++;
        // Identifiers must be non-null
        if (type === 'identifier') {
          addIssue(issues, rowIndex, col, value, 'Identifier cannot be null', 'error', 'required');
          result.invalid_values++;
          result.failed_checks.push('non-null');
          errorCount++;
        }
        return; // Skip other checks if null
      }

      let isValid = true;
      const strVal = String(value).trim();

      switch (type) {
        case 'identifier':
          if (uniqueSets[col].has(strVal)) {
            addIssue(issues, rowIndex, col, value, 'Duplicate identifier', 'error', 'duplicate');
            isValid = false;
            result.failed_checks.push('uniqueness');
            errorCount++;
          } else {
            uniqueSets[col].add(strVal);
          }
          break;

        case 'numeric_amount':
          if (isNaN(Number(strVal))) {
            addIssue(issues, rowIndex, col, value, 'Invalid numeric value', 'error', 'type');
            isValid = false;
            result.failed_checks.push('numeric_conversion');
            errorCount++;
          } else {
            const num = Number(strVal);
            numericValues[col].push(num);
            if (num < 0) {
              addIssue(issues, rowIndex, col, value, 'Negative value detected', 'warning', 'range');
              // Warning doesn't necessarily mark value as invalid for processing, but reduces score
              warningCount++;
              result.failed_checks.push('non-negative');
            }
          }
          break;

        case 'date':
          if (isNaN(Date.parse(strVal))) {
             // Try simple regex backup for common formats before failing
             const dateRegex = /^\d{4}[-\/]\d{2}[-\/]\d{2}$|^\d{2}[-\/]\d{2}[-\/]\d{4}$/;
             if (!dateRegex.test(strVal)) {
                addIssue(issues, rowIndex, col, value, 'Invalid date format', 'error', 'format');
                isValid = false;
                result.failed_checks.push('date_parsing');
                errorCount++;
             }
          } else {
            const d = new Date(strVal);
            if (d > new Date()) {
               addIssue(issues, rowIndex, col, value, 'Future date detected', 'warning', 'range');
               warningCount++;
               result.failed_checks.push('not_future');
            }
          }
          break;

        case 'contact_info':
          // Email heuristic
          if (strVal.includes('@')) {
             if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
               addIssue(issues, rowIndex, col, value, 'Invalid email format', 'error', 'format');
               isValid = false;
               result.failed_checks.push('email_regex');
               errorCount++;
             }
          } 
          // Phone heuristic (digits length)
          else if (/[0-9]/.test(strVal)) {
             const digits = strVal.replace(/\D/g, '');
             if (digits.length < 7 || digits.length > 15) {
                addIssue(issues, rowIndex, col, value, 'Suspicious phone number length', 'warning', 'format');
                warningCount++;
                result.failed_checks.push('phone_length');
             }
          }
          break;

        case 'boolean_flag':
          const lower = strVal.toLowerCase();
          if (!['true', 'false', '0', '1', 'yes', 'no', 'y', 'n'].includes(lower)) {
             addIssue(issues, rowIndex, col, value, 'Invalid boolean value', 'error', 'type');
             isValid = false;
             result.failed_checks.push('boolean_conversion');
             errorCount++;
          }
          break;
          
        case 'categorical':
          categoricalValues[col].add(strVal);
          // Case consistency check happens in post-processing or via set size? 
          // We can check inconsistent casing if we see 'Apple' and 'apple' but that requires global context.
          // For row-by-row, we just collect.
          break;

        case 'free_text':
           if (strVal.length > 10000) {
              addIssue(issues, rowIndex, col, value, 'Excessive text length', 'warning', 'consistency');
              warningCount++;
              result.failed_checks.push('length_check');
           }
           // Simple encoding check (control characters)
           // eslint-disable-next-line no-control-regex
           if (/[\x00-\x08\x0E-\x1F]/.test(strVal)) {
              addIssue(issues, rowIndex, col, value, 'Hidden control characters detected', 'warning', 'encoding');
              warningCount++;
              result.failed_checks.push('encoding');
           }
           break;
      }

      if (isValid) {
        result.valid_values++;
      } else {
        result.invalid_values++;
      }
    });
  });

  // 2. Post-Validation Global Checks (Outliers, etc.)
  Object.entries(numericValues).forEach(([col, values]) => {
     if (values.length < 10) return; // Not enough data for stats
     
     // IQR Outlier Detection
     values.sort((a, b) => a - b);
     const q1 = values[Math.floor(values.length * 0.25)];
     const q3 = values[Math.floor(values.length * 0.75)];
     const iqr = q3 - q1;
     const lowerBound = q1 - 1.5 * iqr;
     const upperBound = q3 + 1.5 * iqr;
     
     // Note: We can't easily attribute back to specific rows without storing indices, 
     // but for this implementation we'll add a general field warning or skip if too complex for row-mapping.
     // Requirement says "Iterate through every value... Each value must be individually checked."
     // So outlier detection ideally should be done if we can flag the specific values.
     // Re-scanning data for outliers:
     const outliers = data.map((r, i) => ({ val: r[col], idx: i }))
                          .filter(item => {
                              const v = Number(item.val);
                              return !isNaN(v) && (v < lowerBound || v > upperBound);
                          });
     
     outliers.forEach(o => {
        addIssue(issues, o.idx, col, o.val, `Outlier detected (Range: ${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)})`, 'warning', 'range');
        warningCount++;
        fieldResults[col].failed_checks.push('outlier_iqr');
        if (!fieldResults[col].failed_checks.includes('outlier_iqr')) fieldResults[col].failed_checks.push('outlier_iqr');
     });
  });

  // 3. Score Calculation
  let totalFieldScores = 0;
  columns.forEach(col => {
    const res = fieldResults[col];
    // Simple score: (Valid / Total) * 100
    // Penalize warnings slightly
    const validRatio = res.total_values > 0 ? res.valid_values / res.total_values : 0;
    let score = validRatio * 100;
    
    // Deduct for warnings (e.g. 1 point per 1% of warnings, capped)
    // We don't track warning count per field explicitly in the struct above, but we could.
    // Let's use invalid_values for now as primary driver.
    // If we want to strictly follow "Errors -> correctness, Warnings -> quality risks",
    // Score should reflect correctness primarily, maybe quality secondarily.
    
    res.quality_score = Math.round(Math.max(0, Math.min(100, score)));
    totalFieldScores += res.quality_score;
    
    // Deduplicate failed checks list
    res.failed_checks = Array.from(new Set(res.failed_checks));
  });

  const datasetScore = columns.length > 0 ? Math.round(totalFieldScores / columns.length) : 0;

  // 4. Status Determination
  let status: 'pass' | 'warn' | 'fail' = 'pass';
  if (datasetScore < 60 || errorCount > data.length * 0.1) status = 'fail';
  else if (datasetScore < 90 || warningCount > 0) status = 'warn';

  return {
    dataset_quality_score: datasetScore,
    total_records: data.length,
    processed_records: data.length,
    error_count: errorCount,
    warning_count: warningCount,
    validation_status: status,
    field_validation_results: fieldResults,
    issues: issues.slice(0, 100) // Limit output issues
  };
};

const addIssue = (
  issues: ValidationIssue[], 
  row: number, 
  col: string, 
  val: any, 
  msg: string, 
  sev: 'error' | 'warning' | 'info',
  type: ValidationIssue['type']
) => {
  if (issues.length >= 1000) return; // Cap total issues collected in memory
  issues.push({
    row: row + 1, // 1-based index for display
    column: col,
    value: val,
    message: msg,
    severity: sev,
    type: type
  });
};
