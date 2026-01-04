import type { UnifiedRecord } from './input-processor';
import type { ProcessedRecordResult, BatchIngestionResult, ValidationError, ErrorReport } from '../types/validation';
import { validateRecord } from './validation-engine';

export const processRecordSafely = (record: UnifiedRecord): ProcessedRecordResult => {
    try {
        const validation = validateRecord(record);

        if (!validation.isValid) {
            // Check if any error is HIGH or CRITICAL
            // CRITICAL should have been handled at batch level if it affects the whole file,
            // but if it slips through to here, we treat it as failure.

            const hasCritical = validation.errors.some(e => e.severity === 'CRITICAL');
            const hasHigh = validation.errors.some(e => e.severity === 'HIGH');

            if (hasCritical || hasHigh) {
                return {
                    record: record,
                    errors: validation.errors,
                    status: 'FAILED'
                };
            }

            // Medium/Low are warnings, status is SUCCESS (or PARTIAL if we had that semantic, but usually we just want to save it with warnings)
            // Requirement says: "Valid records are saved... Invalid records are skipped". 
            // Severity Rules: 
            // LOW -> Log only 
            // MEDIUM -> Include in error report (but Record deemed valid?)
            // HIGH -> Mark record as failed
            // CRITICAL -> Abort only the current file

            return {
                record: record,
                errors: validation.errors,
                status: 'SUCCESS' // It continues, but has non-blocking errors
            };
        }

        return {
            record: record,
            status: 'SUCCESS'
        };
    } catch (error: any) {
        return {
            record: record,
            errors: [{
                code: 'ForcedException',
                message: error.message || 'Unknown error processing record',
                severity: 'HIGH'
            }],
            status: 'FAILED'
        };
    }
};

export const processBatch = (
    records: UnifiedRecord[]
): BatchIngestionResult => {
    const successful_records: UnifiedRecord[] = [];
    const failed_records: { record_id?: string; source_file: string; errors: ValidationError[] }[] = [];

    // Group records by file to handle CRITICAL file-level aborts
    const recordsByFile: Record<string, UnifiedRecord[]> = {};
    records.forEach(r => {
        const fileName = r.metadata.file_name || 'unknown_file';
        if (!recordsByFile[fileName]) recordsByFile[fileName] = [];
        recordsByFile[fileName].push(r);
    });

    const summary = {
        total: records.length,
        success: 0,
        failed: 0,
        warnings: 0
    }; // Initialize strict counts

    // Process file by file
    for (const [fileName, fileRecords] of Object.entries(recordsByFile)) {
        let fileAborted = false;

        for (const record of fileRecords) {
            if (fileAborted) {
                // Mark remaining as failed due to abort? Or just skip?
                // "Abort only the current file". 
                // We should probably log them as skipped/failed.
                failed_records.push({
                    record_id: record.id,
                    source_file: fileName,
                    errors: [{
                        code: 'FILE_ABORTED',
                        message: 'File processing aborted due to earlier CRITICAL error',
                        severity: 'CRITICAL'
                    }]
                });
                summary.failed++;
                continue;
            }

            const result = processRecordSafely(record);

            // Check for CRITICAL error in the result errors
            if (result.errors && result.errors.some(e => e.severity === 'CRITICAL')) {
                fileAborted = true; // Stop processing this file
                // Fail this current record
                failed_records.push({
                    record_id: record.id,
                    source_file: fileName,
                    errors: result.errors
                });
                summary.failed++;
                continue;
            }

            if (result.status === 'SUCCESS') {
                successful_records.push(result.record!); // record matches UnifiedRecord
                summary.success++;

                const warnings = result.errors?.filter(e => e.severity === 'MEDIUM' || e.severity === 'LOW');
                if (warnings && warnings.length > 0) {
                    summary.warnings++;
                    // Optionally add to failed_records list just for reporting warnings?
                    // structure of failed_records implies it's for failures. 
                    // But we might want to track warnings in a report.
                    // For now, let's strictly follow "failed_records" for failures.
                }
            } else {
                failed_records.push({
                    record_id: record.id,
                    source_file: fileName,
                    errors: result.errors || []
                });
                summary.failed++;
            }
        }
    }

    return {
        successful_records,
        failed_records,
        summary
    };
};

export const generateErrorReport = (batchResult: BatchIngestionResult, batchId: string): ErrorReport => {
    const errors: ErrorReport['errors'] = [];

    batchResult.failed_records.forEach(fail => {
        fail.errors.forEach(err => {
            errors.push({
                file: fail.source_file,
                record_id: fail.record_id,
                severity: err.severity,
                message: err.message,
                suggestion: err.suggestion
            });
        });
    });

    return {
        batch_id: batchId,
        timestamp: new Date().toISOString(),
        errors
    };
};
