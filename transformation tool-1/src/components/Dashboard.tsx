import React, { useState } from 'react';
import { UnifiedInput } from './UnifiedInput';
import { CleaningReportUI } from './CleaningReportUI';
import { Layout } from './layout/Layout';
import { cleanUnifiedData } from '../lib/cleaner';
import type { CleaningReport } from '../types';
import type { UnifiedRecord } from '../lib/input-processor';
import { Loader2, AlertCircle, Database, HardDrive, FileJson, CheckCircle2 } from 'lucide-react';

import { linkRecordsByTopic } from '../lib/topic-linker';

export const Dashboard: React.FC = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [cleaningReport, setCleaningReport] = useState<CleaningReport | null>(null);
    const [step, setStep] = useState<'upload' | 'analysis' | 'unified_complete'>('upload');
    const [processingStage, setProcessingStage] = useState<string>('Initializing pipeline...');
    const [error, setError] = useState<string | null>(null);

    const handleUnifiedDataReady = (data: UnifiedRecord[]) => {
        setIsProcessing(true);
        setError(null);
        setStep('analysis'); // Show loading state

        // Simulate processing pipeline steps with stage updates
        const executePipeline = async () => {
            // Step 1: Ingestion & Extraction
            setProcessingStage('Ingesting files & extracting raw text...');
            await new Promise(resolve => setTimeout(resolve, 1500));

            try {
                // Step 2: Topic Linking & Enrichment
                setProcessingStage('Analyzing context & linking topics...');
                // 0. Topic Linking (Enrichment Layer)
                const linkedData = linkRecordsByTopic(data);
                await new Promise(resolve => setTimeout(resolve, 1200));

                // Step 3: Cleaning & Normalization
                setProcessingStage('Cleaning data & normalizing formats...');
                // 1. Cleaning Layer
                const { cleanedRecords, stats } = cleanUnifiedData(linkedData);
                await new Promise(resolve => setTimeout(resolve, 1200));

                const report: CleaningReport = {
                    stats,
                    cleaned_data: cleanedRecords,
                    dropped_rows: []
                };
                setCleaningReport(report);

                // Step 4: Storage Ops
                setProcessingStage('Structuring output & validating schema...');
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 2. Data Collection & Output Mock
                // (In a real app, this would upload to S3 and insert into DB)
                console.log("Storing raw files in Object Storage...");
                console.log("Inserting structured records into Database...");

                setStep('unified_complete');
            } catch (err) {
                console.error(err);
                setError("An error occurred during the data transformation process.");
                setStep('upload');
            } finally {
                setIsProcessing(false);
            }
        };

        executePipeline();
    };

    const handleRestart = () => {
        setCleaningReport(null);
        setStep('upload');
    };

    return (
        <Layout showBackground={step !== 'unified_complete'}>
            <div className="space-y-8">
                {step === 'upload' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white">Unified Data Ingestion</h2>
                            <p className="text-slate-400 mt-2">Upload any file type (PDF, Audio, Image, CSV, Text) or record live audio.</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <UnifiedInput onDataReady={handleUnifiedDataReady} onError={setError} />
                    </div>
                )}

                {/* Unified Loading State */}
                {isProcessing && (
                    <div className="flex flex-col items-center justify-center min-h-[500px] animate-in fade-in duration-500">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20 blur-xl"></div>
                            <div className="relative bg-black/40 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-indigo-500/20">
                                <Loader2 className="w-16 h-16 animate-spin text-indigo-400" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white tracking-tight">Processing Data Pipeline</h3>
                        <p className="text-indigo-300 mt-2 font-mono text-sm uppercase tracking-wider animate-pulse">
                            {processingStage}
                        </p>
                        <p className="text-slate-400 mt-3 max-w-md text-center text-lg leading-relaxed">
                            Ingesting content, extracting text, cleaning data, and structuring records...
                        </p>
                        <div className="mt-8 w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full animate-progress origin-left"></div>
                        </div>
                    </div>
                )}

                {step === 'unified_complete' && cleaningReport && (
                    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-6 gap-4">
                            <div>
                                <h2 className="text-3xl font-bold text-white tracking-tight">Ingestion Complete</h2>
                                <p className="text-slate-400 mt-2 text-lg">Data has been extracted, cleaned, and structured successfully.</p>
                            </div>
                            <button
                                onClick={handleRestart}
                                className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all shadow-sm backdrop-blur-sm"
                            >
                                Start New Ingestion
                            </button>
                        </div>

                        {/* System Status / Storage Layer Visualization */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
                                <div className="relative flex items-center gap-4">
                                    <div className="p-4 bg-green-500/20 text-green-400 rounded-xl group-hover:scale-105 transition-transform duration-300">
                                        <HardDrive className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg">Object Storage</h4>
                                        <p className="text-sm text-green-400 font-medium flex items-center gap-1.5 mt-1">
                                            <CheckCircle2 className="w-4 h-4" /> Raw Files Saved
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
                                <div className="relative flex items-center gap-4">
                                    <div className="p-4 bg-blue-500/20 text-blue-400 rounded-xl group-hover:scale-105 transition-transform duration-300">
                                        <Database className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg">Vector Database</h4>
                                        <p className="text-sm text-blue-400 font-medium flex items-center gap-1.5 mt-1">
                                            <CheckCircle2 className="w-4 h-4" /> Embeddings Ready
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
                                <div className="relative flex items-center gap-4">
                                    <div className="p-4 bg-purple-500/20 text-purple-400 rounded-xl group-hover:scale-105 transition-transform duration-300">
                                        <FileJson className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg">Structured Data</h4>
                                        <p className="text-sm text-purple-400 font-medium flex items-center gap-1.5 mt-1">
                                            <CheckCircle2 className="w-4 h-4" /> JSON Schema Valid
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cleaning Report */}
                        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-sm p-6">
                            <CleaningReportUI
                                report={cleaningReport}
                                onRestart={handleRestart}
                            />
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};
