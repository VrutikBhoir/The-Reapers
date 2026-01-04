import type { DomainSchema, MappingResult } from '../types';
import { USER_SCHEMA } from './schemas'; // Default fallback

// Keep for backward compatibility if needed, but we'll prefer passing schema
export const CANONICAL_SCHEMA = USER_SCHEMA.fields;

export const generateMapping = (detectedColumns: string[], _targetSchema: DomainSchema = USER_SCHEMA): MappingResult => {
  const mapped_columns: Record<string, string> = {};
  const unknown_columns: string[] = [];

  detectedColumns.forEach(col => {
    // Directly assign source column name to target field
    mapped_columns[col] = col;
  });
  
  // No missing schema fields since we are not mapping to a predefined schema
  const missing_schema_fields: string[] = [];

  return {
    detected_columns: detectedColumns,
    mapped_columns,
    unknown_columns,
    missing_schema_fields
  };
};
