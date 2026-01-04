import type { DomainSchema, CleaningReport, CleaningStats, SemanticMapping } from '../types';
import { USER_SCHEMA } from './schemas';
import type { UnifiedRecord } from './input-processor';
import { processBatch } from './batch-processor';
import { validateData } from './validator';

export const cleanUnifiedData = (records: UnifiedRecord[]): { cleanedRecords: UnifiedRecord[], stats: CleaningStats } => {
  const initial_records = records.length;

  // 1. Text Cleaning Phase (Legacy logic reused for normalization)
  const cleanedTextRecords: UnifiedRecord[] = [];
  const cleaningStats: CleaningStats = {
    initial_records,
    records_after_validation: initial_records,
    records_after_cleaning: 0,
    records_with_critical_errors: 0,
    records_with_warnings: 0,
    dropped_records: 0,
    fixes_applied: {}
  };
  const incrementStat = (key: string) => {
    cleaningStats.fixes_applied[key] = (cleaningStats.fixes_applied[key] || 0) + 1;
  };
  const seenContent = new Set<string>();

  // Helper patterns
  const patterns = {
    headers: /(^|\n)(CHAPTER|SECTION|PART|PAGE|MODULE|UNIT)\s+\d+[:.]?/gi,
    pageMarkers: /(^|\n)(\d+\s*\|\s*Page|Page\s*\d+|^\d+$)/gim,
    timestamps: /\b\d{1,2}:\d{2}(:\d{2})?\b/g,
    fillers: /\b(um|uh|er|ah|like|you know|sort of|kind of|i mean|actually|basically|literally|right|okay|so)\b/gi,
    multipleSpaces: /\s{2,}/g,
    ocrFixes: [
      [/\b(Ph0tosynthes1s)\b/gi, 'Photosynthesis'],
      [/\b(rn)\b/g, 'm'],
      [/\b(1)\b/g, 'I'],
      [/\b(l)\b/g, 'I'],
      [/\b(vv)\b/g, 'w'],
      [/\b(teh)\b/gi, 'the'],
      [/\b(w1th)\b/gi, 'with'],
      [/\b(dat4)\b/gi, 'data']
    ] as [RegExp, string][],
    abbreviations: {
      'CO2': 'carbon dioxide',
      'H2O': 'water',
      'w/': 'with',
      'w/o': 'without',
      'vs': 'versus',
      'etc': 'et cetera',
      'e.g.': 'for example',
      'i.e.': 'that is',
      'approx.': 'approximately'
    } as Record<string, string>
  };

  // Apply cleaning transformations first
  records.forEach(record => {
    let content = record.structured_content || "";

    // Skip aggressive text cleaning for structured data types (API, CSV, JSON) into to preserve syntax
    // Check explicit source type OR if it's 'log'/'csv' which are structural
    const isStructured = ['api', 'csv', 'log', 'json'].includes(record.source_type) ||
      (record.source_type === 'api');

    if (!isStructured) {
      // 1. Remove Headers, Page Markers
      if (patterns.headers.test(content)) { content = content.replace(patterns.headers, ' ').trim(); incrementStat('headers_removed'); }
      if (patterns.pageMarkers.test(content)) { content = content.replace(patterns.pageMarkers, ' ').trim(); incrementStat('page_markers_removed'); }
      if (patterns.timestamps.test(content)) {
        content = content.replace(patterns.timestamps, ' ').trim(); incrementStat('timestamps_removed_from_text');
      }

      // 2. Remove Filler Words
      if (patterns.fillers.test(content)) { content = content.replace(patterns.fillers, ' ').trim(); incrementStat('filler_words_removed'); }

      // 3. Fix OCR
      if (record.source_type === 'pdf' || record.source_type === 'image') {
        patterns.ocrFixes.forEach(([pattern, repl]) => {
          if (pattern.test(content)) { content = content.replace(pattern, repl); incrementStat('ocr_errors_fixed'); }
        });
      }

      // 4. Abbreviations
      Object.entries(patterns.abbreviations).forEach(([abbr, expansion]) => {
        const escapedAbbr = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex2 = new RegExp(`\\b${escapedAbbr}\\b`, 'gi');
        if (regex2.test(content)) { content = content.replace(regex2, expansion); incrementStat('abbreviations_expanded'); }
      });

      // 5. Casing
      if (content && content.length > 0) {
        content = content.replace(/(^\s*\w|[\.\?!]\s*\w)/g, (c) => c.toUpperCase());
        if (content === content.toUpperCase() && content.length > 10) {
          content = content.charAt(0).toUpperCase() + content.slice(1).toLowerCase();
          incrementStat('shouting_fixed');
        }
      }

      // Spacing
      if (patterns.multipleSpaces.test(content)) { content = content.replace(patterns.multipleSpaces, ' ').trim(); incrementStat('spacing_fixed'); }
    }

    // Deduplication check
    const signature = `${record.source_type}:${content.toLowerCase().trim()}:${record.group_id}`;
    if (seenContent.has(signature)) {
      cleaningStats.dropped_records++;
      incrementStat('duplicates_removed');
      return; // Drop duplicate
    }
    seenContent.add(signature);

    cleanedTextRecords.push({
      ...record,
      structured_content: content
    });
  });

  // 2. Run Batch Validation & Processing ON CLEANED RECORDS
  // This ensures valid content (e.g. non-empty after cleaning)
  const batchResult = processBatch(cleanedTextRecords);

  // 3. Merge Stats
  // We combine the cleaning stats with the validation stats
  const finalStats: CleaningStats = {
    initial_records: initial_records,
    records_after_validation: batchResult.summary.total,
    records_after_cleaning: batchResult.successful_records.length,
    records_with_critical_errors: batchResult.summary.failed,
    records_with_warnings: batchResult.summary.warnings,
    dropped_records: cleaningStats.dropped_records + batchResult.summary.failed,
    fixes_applied: {
      ...cleaningStats.fixes_applied,
      'validation_passed': batchResult.summary.success
    }
  };

  return {
    cleanedRecords: batchResult.successful_records,
    stats: finalStats
  };
};

export const cleanData = (
  data: any[],
  mapping: Record<string, string>,
  semanticMapping: SemanticMapping,
  _targetSchema: DomainSchema = USER_SCHEMA
): CleaningReport => {
  const initial_records = data.length;

  const stats: CleaningStats = {
    initial_records,
    records_after_validation: initial_records,
    records_after_cleaning: 0,
    records_with_critical_errors: 0,
    records_with_warnings: 0,
    dropped_records: 0,
    fixes_applied: {}
  };

  const dropped_rows: number[] = [];
  const cleaned_data: any[] = [];
  const seenIds = new Set<string | number>();

  // Helper to increment stats
  const incrementStat = (key: string) => {
    stats.fixes_applied[key] = (stats.fixes_applied[key] || 0) + 1;
  };

  // Identify identifier columns for deduplication
  const identifierCols = Object.keys(semanticMapping).filter(col => semanticMapping[col] === 'identifier');

  data.forEach((row, index) => {
    const record: Record<string, any> = {};
    let shouldDrop = false;

    // 1. Row-level Checks (Identifier)
    if (identifierCols.length > 0) {
      const primaryIdCol = identifierCols[0];
      const rawId = row[primaryIdCol];

      if (rawId === null || rawId === undefined || String(rawId).trim() === '') {
        shouldDrop = true;
      } else {
        const idVal = String(rawId).trim();
        if (seenIds.has(idVal)) {
          shouldDrop = true; // Duplicate ID
        } else {
          seenIds.add(idVal);
        }
      }
    }

    if (shouldDrop) {
      dropped_rows.push(index);
      return;
    }

    // 2. Field-level Cleaning based on Semantic Type
    Object.keys(mapping).forEach(sourceCol => {
      const targetField = mapping[sourceCol];
      const semanticType = semanticMapping[sourceCol] || 'free_text';
      let value = row[sourceCol];
      const originalValue = value;

      if (value === null || value === undefined) {
        record[targetField] = null;
        return;
      }

      switch (semanticType) {
        case 'name':
          if (typeof value === 'string') {
            value = value.trim().replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            if (value !== originalValue) incrementStat('names_formatted');
          }
          break;

        case 'contact_info':
          if (typeof value === 'string') {
            const strVal = value.trim();
            if (strVal.includes('@')) {
              const emailVal = strVal.toLowerCase();
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
                value = null;
              } else {
                if (emailVal !== value) incrementStat('emails_lowercased');
                value = emailVal;
              }
            } else {
              const digits = strVal.replace(/\D/g, '');
              if (digits.length < 7 || digits.length > 15) {
                value = null;
              } else {
                if (digits !== strVal) incrementStat('phones_normalized');
                value = digits;
              }
            }
          }
          break;

        case 'date':
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            value = null;
          } else {
            const formatted = date.toISOString().split('T')[0];
            if (formatted !== value) incrementStat('dates_standardized');
            value = formatted;
          }
          break;

        case 'numeric_amount':
          const numStr = String(value).replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(numStr);
          if (isNaN(parsed) || parsed < 0) {
            value = null;
            if (!isNaN(parsed) && parsed < 0) incrementStat('negative_values_nullified');
          } else {
            value = parsed;
            if (value !== originalValue) {
              incrementStat('numerics_standardized');
            }
          }
          break;

        case 'boolean_flag':
          const boolStr = String(value).toLowerCase();
          if (['true', '1', 'yes', 'on', 'active'].includes(boolStr)) {
            value = true;
          } else if (['false', '0', 'no', 'off', 'inactive'].includes(boolStr)) {
            value = false;
          } else {
            value = null;
          }
          if (value !== originalValue) incrementStat('booleans_normalized');
          break;

        case 'categorical':
        case 'identifier':
        case 'free_text':
        default:
          if (typeof value === 'string') {
            value = value.trim();
            if (value !== originalValue) incrementStat('text_trimmed');
          }
          break;
      }

      record[targetField] = value;
    });

    cleaned_data.push(record);
  });

  // 3. Post-Cleaning Validation Stage
  const targetSemanticMapping: SemanticMapping = {};
  Object.keys(mapping).forEach(sourceCol => {
    const targetCol = mapping[sourceCol];
    if (semanticMapping[sourceCol]) {
      targetSemanticMapping[targetCol] = semanticMapping[sourceCol];
    }
  });

  const validationReport = validateData(cleaned_data, targetSemanticMapping);

  // 4. Handle Critical Errors
  const rowsWithCriticalErrors = new Set<number>();
  const rowsWithWarnings = new Set<number>();

  validationReport.issues.forEach(issue => {
    const arrayIndex = issue.row - 1;
    if (issue.severity === 'critical') {
      rowsWithCriticalErrors.add(arrayIndex);
    } else if (issue.severity === 'warning') {
      rowsWithWarnings.add(arrayIndex);
    }
  });

  stats.records_with_critical_errors = rowsWithCriticalErrors.size;
  stats.records_with_warnings = rowsWithWarnings.size;

  const finalCleanedData = cleaned_data.filter((_, idx) => !rowsWithCriticalErrors.has(idx));

  rowsWithCriticalErrors.forEach(idx => {
    if (!dropped_rows.includes(idx)) dropped_rows.push(idx);
  });
  dropped_rows.sort((a, b) => a - b);

  stats.records_after_cleaning = finalCleanedData.length;
  stats.dropped_records = dropped_rows.length;

  return {
    stats,
    cleaned_data: finalCleanedData,
    dropped_rows
  };
};
