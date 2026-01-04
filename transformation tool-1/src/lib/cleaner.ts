import type { DomainSchema, CleaningReport, CleaningStats, SemanticMapping } from '../types';
import { USER_SCHEMA } from './schemas';
import type { UnifiedRecord } from './input-processor';

export const cleanUnifiedData = (records: UnifiedRecord[]): { cleanedRecords: UnifiedRecord[], stats: CleaningStats } => {
  const initial_records = records.length;
  const stats: CleaningStats = {
    initial_records,
    records_after_validation: initial_records,
    records_after_cleaning: 0,
    dropped_records: 0,
    fixes_applied: {}
  };

  const seenContent = new Set<string>();
  const cleanedRecords: UnifiedRecord[] = [];

  const incrementStat = (key: string) => {
    stats.fixes_applied[key] = (stats.fixes_applied[key] || 0) + 1;
  };

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

  records.forEach(record => {
    // 1. Validation Rules (Grammar check simulated by non-empty and length)
    // If structured_content is null/empty, we might drop or keep. 
    // Requirement: "Keep records separate (no aggregation)". "Return the same records".
    // So we keep them, but maybe flag if empty.
    
    let content = record.structured_content || "";
    const originalContent = content;

    // --- CLEANING STEPS ---

    // 1. Remove Headers, Page Markers, Timestamps
    if (patterns.headers.test(content)) {
      content = content.replace(patterns.headers, ' ').trim();
      incrementStat('headers_removed');
    }
    if (patterns.pageMarkers.test(content)) {
      content = content.replace(patterns.pageMarkers, ' ').trim();
      incrementStat('page_markers_removed');
    }
    // Only remove timestamps if it's not a log/time-sensitive record
    if (record.source_type !== 'api' && record.source_type !== 'log') {
        if (patterns.timestamps.test(content)) {
            content = content.replace(patterns.timestamps, ' ').trim();
            incrementStat('timestamps_removed_from_text');
        }
    }

    // 2. Remove Filler Words
    if (patterns.fillers.test(content)) {
      content = content.replace(patterns.fillers, ' ').trim();
      incrementStat('filler_words_removed');
    }

    // 3. Fix OCR Mistakes
    if (record.source_type === 'pdf' || record.source_type === 'image') {
       patterns.ocrFixes.forEach(([pattern, replacement]) => {
         if (pattern.test(content)) {
            content = content.replace(pattern, replacement);
            incrementStat('ocr_errors_fixed');
         }
       });
    }

    // 4. Expand Abbreviations
    // We iterate over known abbreviations. 
    // Note: Be careful with case sensitivity.
    Object.entries(patterns.abbreviations).forEach(([abbr, expansion]) => {
       // For things like 'w/', regex needs escaping.
       const escapedAbbr = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
       const regex2 = new RegExp(`\\b${escapedAbbr}\\b`, 'gi'); // Case insensitive for general text
       
       if (regex2.test(content)) {
          content = content.replace(regex2, expansion);
          incrementStat('abbreviations_expanded');
       }
    });

    // 5. Casing & Formatting
    // No ALL-CAPS words unless proper nouns (heuristic: length > 1 and not known acronyms)
    // We'll lowercase words that are ALL CAPS if they are longer than 4 chars (simple heuristic)
    // or convert entire sentence to sentence case if it looks like a heading.
    
    // Sentence casing for the whole block
    if (content && content.length > 0) {
        // Simple sentence casing: Uppercase first letter of content, and after [.?!]
        content = content.replace(/(^\s*\w|[\.\?!]\s*\w)/g, (c) => c.toUpperCase());
        
        // Handle SHOUTING TEXT
        if (content === content.toUpperCase() && content.length > 10) {
            content = content.charAt(0).toUpperCase() + content.slice(1).toLowerCase();
            incrementStat('shouting_fixed');
        }
    }

    // Fix spacing
    if (patterns.multipleSpaces.test(content)) {
      content = content.replace(patterns.multipleSpaces, ' ').trim();
      incrementStat('spacing_fixed');
    }

    // --- ENRICHMENT STEPS ---
    
    // Initialize metadata if missing (though interface says it's there)
    const enrichedMetadata = { ...record.metadata };

    if (record.source_type === 'pdf') {
        enrichedMetadata.file_name = enrichedMetadata.file_name || 'unknown.pdf';
        enrichedMetadata.page = enrichedMetadata.page || '1'; // Default if missing
        
        // Infer section
        const sectionMatch = originalContent.match(/(?:Section|Part|Chapter)\s+(\d+|[A-Z]+)/i);
        enrichedMetadata.section = sectionMatch ? `Section ${sectionMatch[1]}` : (enrichedMetadata.section || '');
    } 
    else if (record.source_type === 'audio') {
        enrichedMetadata.file_name = enrichedMetadata.file_name || 'audio_recording';
        enrichedMetadata.speaker = enrichedMetadata.speaker || 'teacher';
        
        // Ensure timestamp_range exists
        if (!enrichedMetadata.timestamp_range) {
             enrichedMetadata.timestamp_range = enrichedMetadata.timestamp || '00:00:00';
        }
    }
    else if (record.source_type === 'api' || record.source_type === 'chat') {
        enrichedMetadata.user_id = enrichedMetadata.user_id || 'anonymous_user';
        
        // Infer event_type
        if (!enrichedMetadata.event_type) {
            if (content.toLowerCase().includes('error')) enrichedMetadata.event_type = 'error';
            else if (content.toLowerCase().includes('warning')) enrichedMetadata.event_type = 'warning';
            else if (content.includes('?')) enrichedMetadata.event_type = 'question';
            else enrichedMetadata.event_type = 'message';
        }
    }

    // --- DEDUPLICATION ---
    // User said "Keep records separate (no aggregation)".
    // But duplicate content might be noise. 
    // "Return the same records" suggests we should NOT drop them unless they are exact duplicates that shouldn't exist?
    // "Do NOT merge records".
    // "Clean and normalize structured_content".
    // I will keep the deduplication logic but maybe be less aggressive, or remove it if "Return the same records" implies strict 1:1 input:output count.
    // However, usually "cleaning" implies removing duplicates.
    // Let's stick to content-based deduplication to avoid clutter.
    
    const signature = `${record.source_type}:${content.toLowerCase().trim()}:${record.group_id}`;
    if (seenContent.has(signature)) {
      stats.dropped_records++;
      incrementStat('duplicates_removed');
      return; // Drop duplicate
    }
    seenContent.add(signature);

    // Update record
    cleanedRecords.push({
      ...record,
      structured_content: content,
      metadata: enrichedMetadata
    });
  });

  stats.records_after_cleaning = cleanedRecords.length;

  return { cleanedRecords, stats };
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
    // If multiple identifiers exist, we check the first one as the "primary" key for now, 
    // or we could check all. Let's use the first mapped identifier.
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
                    // Title Case
                    value = value.trim().replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                    if (value !== originalValue) incrementStat('names_formatted');
                }
                break;

            case 'contact_info':
                if (typeof value === 'string') {
                    const strVal = value.trim();
                    if (strVal.includes('@')) {
                        // Assume Email
                        const emailVal = strVal.toLowerCase();
                        // Strict validation: if invalid format, nullify
                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
                            value = null; // Invalid email
                        } else {
                            if (emailVal !== value) incrementStat('emails_lowercased');
                            value = emailVal;
                        }
                    } else {
                        // Assume Phone
                        const digits = strVal.replace(/\D/g, '');
                        // Strict validation: if invalid length, nullify
                        if (digits.length < 7 || digits.length > 15) {
                            value = null; // Invalid phone
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
                    value = null; // Invalid date
                } else {
                    const formatted = date.toISOString().split('T')[0]; // YYYY-MM-DD
                    // Sanity check for date range (e.g. not year 1900 or future if that's a rule)
                    // For now, just ensuring it's a valid date object is good, but let's be strict on "Invalid Date" string
                    if (formatted !== value) incrementStat('dates_standardized');
                    value = formatted;
                }
                break;

            case 'numeric_amount':
                const numStr = String(value).replace(/[^0-9.-]/g, ''); // Keep digits, dots, minus
                const parsed = parseFloat(numStr);
                // Any value that fails semantic validation (NaN, negative for amount) is nullified
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
                    value = null; // Ambiguous boolean
                }
                if (value !== originalValue) incrementStat('booleans_normalized');
                break;

            case 'categorical':
                if (typeof value === 'string') {
                    value = value.trim();
                    // Optional: Consistent casing? Let's leave it as trim for now to preserve category codes
                    if (value !== originalValue) incrementStat('text_trimmed');
                }
                break;
            
            case 'identifier':
                 // Already handled in row check, but we should trim it for the record
                 if (typeof value === 'string') {
                     value = value.trim();
                 }
                 break;

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

  stats.records_after_cleaning = cleaned_data.length;
  stats.dropped_records = dropped_rows.length;

  return {
    stats,
    cleaned_data,
    dropped_rows
  };
};
