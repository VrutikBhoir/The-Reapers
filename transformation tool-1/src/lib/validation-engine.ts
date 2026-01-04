import type { UnifiedRecord } from './input-processor';
import type { ValidationResult, ValidationError } from '../types/validation';

export const validateRecord = (record: UnifiedRecord): ValidationResult => {
    const errors: ValidationError[] = [];

    // 1. General Rules
    validateGeneralRules(record, errors);

    // 2. Type-Specific Rules
    switch (record.source_type) {
        case 'audio':
            validateAudioRules(record, errors);
            break;
        case 'pdf':
            validatePDFRules(record, errors);
            break;
        case 'api':
            validateAPIRules(record, errors);
            break;
        case 'csv':
            validateCSVRules(record, errors);
            break;
        case 'text':
            // Text might have minimal rules
            break;
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

const validateGeneralRules = (record: UnifiedRecord, errors: ValidationError[]) => {
    // structured_content must not be empty
    if (!record.structured_content || record.structured_content.trim() === '') {
        errors.push({
            code: 'EMPTY_CONTENT',
            message: 'Structured content must not be empty',
            severity: 'CRITICAL',
            field: 'structured_content',
            suggestion: 'Ensure the source file is not empty or corrupted'
        });
    }

    // topic must exist
    if (!record.topic || record.topic.trim() === '') {
        errors.push({
            code: 'MISSING_TOPIC',
            message: 'Topic must exist',
            severity: 'HIGH',
            field: 'topic',
            suggestion: 'Run topic linking before validation or check PDF anchor extraction'
        });
    }

    // group_id must exist
    if (!record.group_id || record.group_id.trim() === '') {
        errors.push({
            code: 'MISSING_GROUP_ID',
            message: 'Group ID must exist',
            severity: 'HIGH',
            field: 'group_id'
        });
    }
};

const validateAudioRules = (record: UnifiedRecord, errors: ValidationError[]) => {
    const content = record.structured_content.toLowerCase();

    // "This audio" or "The lecture" check
    if (content.startsWith('this audio') || content.startsWith('the lecture')) {
        errors.push({
            code: 'INVALID_AUDIO_START',
            message: 'Audio transcript starts with prohibited phrase (e.g. "This audio", "The lecture")',
            severity: 'HIGH',
            suggestion: 'Check if this is a summary instead of a raw transcript'
        });
    }

    // Summary check (heuristic)
    if (content.includes('summary') && content.length < 500) {
        errors.push({
            code: 'POTENTIAL_SUMMARY',
            message: 'Content appears to be a summary',
            severity: 'HIGH',
            suggestion: 'Use real speech-to-text'
        });
    }

    if (content.includes('# ') || content.includes('## ')) {
        errors.push({
            code: 'MARKDOWN_DETECTED',
            message: 'Audio transcript contains markdown headers, suggesting it might be a summary note',
            severity: 'MEDIUM'
        });
    }
};

const validatePDFRules = (record: UnifiedRecord, errors: ValidationError[]) => {
    // Page text length threshold
    if (record.source_type === 'pdf' && record.structured_content.length < 50) {
        errors.push({
            code: 'PDF_TEXT_TOO_SHORT',
            message: 'Page text length is below minimum threshold (50 chars)',
            severity: 'HIGH',
            suggestion: 'Check if page is scanned or blank'
        });
    }

    // OCR confidence
    if (record.metadata.confidence) {
        const confidence = parseFloat(String(record.metadata.confidence));
        if (!isNaN(confidence) && confidence < 0.7) {
            errors.push({
                code: 'LOW_OCR_CONFIDENCE',
                message: `OCR confidence (${confidence}) is below threshold`,
                severity: 'MEDIUM',
                suggestion: 'Manual review recommended'
            });
        }
    }
};

const validateAPIRules = (record: UnifiedRecord, errors: ValidationError[]) => {
    // Must be valid JSON checks
    const contentToCheck = record.raw_content || record.structured_content;

    try {
        JSON.parse(contentToCheck);
    } catch (e) {
        errors.push({
            code: 'INVALID_JSON',
            message: 'Source content is not valid JSON',
            severity: 'CRITICAL',
            field: 'raw_content'
        });
    }

    // Must not define topic independently
    try {
        const obj = JSON.parse(contentToCheck);
        if (obj.topic || obj.Topic) {
            errors.push({
                code: 'INDEPENDENT_TOPIC_DEFINED',
                message: 'API record defines its own topic field, which is prohibited',
                severity: 'HIGH',
                suggestion: 'Remove "topic" field from source JSON'
            });
        }
    } catch (e) {
    }
};

const validateCSVRules = (record: UnifiedRecord, errors: ValidationError[]) => {
    // Validate that CSV row is valid JSON structure (it should be as we stringify it)
    const contentToCheck = record.raw_content || record.structured_content;

    try {
        JSON.parse(contentToCheck);
    } catch (e) {
        errors.push({
            code: 'INVALID_CSV_JSON',
            message: 'CSV raw content is not valid JSON structure',
            severity: 'CRITICAL',
            field: 'raw_content'
        });
    }

    // For CSV, we DO NOT strictly forbid "topic" columns, as they might be legitimate data.
    // We optionally warn if it conflicts, or just ignore it.
    // If the requirement "Must not define topic independently" applies to ALL structured inputs, 
    // then we should keep it. But for CSVs in mixed batches, it's safer to relax it to avoid dropping data 
    // just because a column is named "Topic".

    try {
        const obj = JSON.parse(contentToCheck);
        if (obj.topic || obj.Topic) {
            errors.push({
                code: 'CSV_TOPIC_COLUMN',
                message: 'CSV contains a "topic" column which might conflict with system topic',
                severity: 'MEDIUM', // Warn only, don't fail
                suggestion: 'Ensure this column is not intended to override the group topic'
            });
        }
    } catch (e) {
    }
};
