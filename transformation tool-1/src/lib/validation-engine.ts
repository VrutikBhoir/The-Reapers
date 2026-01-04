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
        case 'csv': // Often API data comes as CSV/JSON, so treat similarly for consistency or separate if needed
            validateAPIRules(record, errors); // Re-using API rules for JSON/Structure checks
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

    // topic must exist (if this is post-linking, but pipeline might be running before linking? 
    // The user prompt implies "The pipeline currently lacks validation... Ingests... Converts... Uses PDF as topic anchor". 
    // If we are validating RAW records, topic might be empty. 
    // BUT the requirements say "topic must exist". 
    // If we assume this validation runs AFTER the "Converts it into a unified structured schema" step which includes Topic Linking?
    // Or maybe it's a constraint that the record *should* have it. 
    // Let's implement it. If it fails early pipeline, we might need to relax it or run this after linking.
    // Given "ingestion pipeline... Uses PDF as the topic & group anchor", likely this validation is post-enrichment.
    if (!record.topic || record.topic.trim() === '') {
        errors.push({
            code: 'MISSING_TOPIC',
            message: 'Topic must exist',
            severity: 'HIGH', // High because it breaks grouping, but maybe not critical for *storing* the raw data? User said CRITICAL aborts current file.
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
            severity: 'HIGH', // User said "Must NOT be a summary"
            suggestion: 'Use real speech-to-text'
        });
    }

    // Spoken language resemblance (heuristic: presence of fillers, lack of markdown headers)
    // Hard to strictly validate "resemble spoken language" without LLM, but we can check for non-spoken artifacts
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

    // OCR confidence (if available in metadata)
    if (record.metadata.confidence) { // Assuming metadata.confidence matches
        const confidence = parseFloat(String(record.metadata.confidence));
        if (!isNaN(confidence) && confidence < 0.7) { // Example threshold
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
    // We prioritize checking raw_content if available, as structured_content might be formatted text
    // If raw_content is missing, we fall back to checking structured_content
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

    // Must not define topic independently (User constraint: "Must not define topic independently")
    // Meaning it should relay on the Group Anchor (PDF)? 
    // Or literally shouldn't have a "topic" field in the raw JSON payload that overrides the system one?
    // Let's check the raw content or the parsed object.
    try {
        const obj = JSON.parse(record.structured_content);
        if (obj.topic || obj.Topic) {
            errors.push({
                code: 'INDEPENDENT_TOPIC_DEFINED',
                message: 'API record defines its own topic field, which is prohibited',
                severity: 'HIGH',
                suggestion: 'Remove "topic" field from source JSON'
            });
        }
    } catch (e) {
        // Already caught above
    }
};
