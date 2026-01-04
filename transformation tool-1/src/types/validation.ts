export type ValidationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ValidationError {
    code: string;
    message: string;
    severity: ValidationSeverity;
    field?: string;
    suggestion?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export interface ProcessedRecordResult {
    record?: any; // Using any to avoid circular dependency with UnifiedRecord if not imported yet, but ideally should be UnifiedRecord
    errors?: ValidationError[];
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
}

export interface BatchIngestionResult {
    successful_records: any[];
    failed_records: {
        record_id?: string;
        source_file: string;
        errors: ValidationError[];
    }[];
    summary: {
        total: number;
        success: number;
        failed: number;
        warnings: number;
    };
}

export interface ErrorReport {
    batch_id: string;
    timestamp: string;
    errors: {
        file: string;
        record_id?: string;
        severity: ValidationSeverity;
        message: string;
        suggestion?: string;
    }[];
}
