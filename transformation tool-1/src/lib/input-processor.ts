import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js
env.allowLocalModels = false; // Force load from CDN
env.useBrowserCache = true;
// Suppress ONNX warnings
// @ts-ignore
env.backends.onnx.logLevel = 'error';
// @ts-ignore
env.backends.onnx.wasm.numThreads = 1; // Prevent potential threading issues in some browsers

// Configure PDF.js worker
// Use local worker file copied to public folder to ensure version match
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface UnifiedRecord {
  id: string;
  group_id: string; // New field for topic linking
  topic: string;    // New field for topic
  source_type: 'pdf' | 'audio' | 'image' | 'api' | 'chat' | 'csv' | 'log' | 'text';
  content_type: 'study_text' | 'explanation' | 'question' | 'log' | 'note';
  structured_content: string; // The main content field
  // raw_content is removed from interface to match strict user schema, but we might keep it internally if needed. 
  // User asked for specific schema, so let's stick to it. But keeping raw_content is useful for debugging.
  // The user schema didn't explicitly forbid other fields, but let's prioritize their list.
  // We'll keep raw_content but mark it as internal or just keep it as it's useful.
  // Actually, user said "Each JSON object must follow this schema". 
  // I will make sure the output JSON strictly follows it, but the TS interface can be flexible.
  raw_content?: string;
  metadata: {
    file_name: string;
    page?: number | string;
    timestamp?: string;
    speaker?: string;
    user_id?: string;
    confidence?: string; // New field
    [key: string]: any;
  };
  created_at: string;
}

export const processInputFile = async (file: File): Promise<UnifiedRecord[]> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return processPDF(file);
  } else if (fileType.startsWith('image/') || /\.(jpg|jpeg|png|bmp|webp)$/.test(fileName)) {
    return processImage(file);
  } else if (fileType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/.test(fileName)) {
    return processAudio(file);
  } else if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
    return processCSV(file);
  } else if (fileType.includes('spreadsheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return processExcel(file);
  } else if (fileType === 'application/json' || fileName.endsWith('.json')) {
    return processJSON(file);
  } else if (fileType.startsWith('text/') || fileName.endsWith('.txt')) {
    return processText(file);
  }

  throw new Error(`Unsupported file type: ${file.type}`);
};

const createRecord = (
  sourceType: UnifiedRecord['source_type'],
  contentType: UnifiedRecord['content_type'],
  content: string,
  metadata: any = {}
): UnifiedRecord => ({
  id: uuidv4(),
  group_id: '', // To be filled by topic linker
  topic: '',    // To be filled by topic linker
  source_type: sourceType,
  content_type: contentType,
  structured_content: content,
  raw_content: content,
  metadata: {
    file_name: metadata.file_name || 'unknown',
    timestamp: new Date().toISOString(),
    confidence: 'high', // Default confidence
    ...metadata
  },
  created_at: new Date().toISOString()
});

const processPDF = async (file: File): Promise<UnifiedRecord[]> => {
  const arrayBuffer = await file.arrayBuffer();
  // Use Uint8Array for data to ensure compatibility
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  }).promise;
  const records: UnifiedRecord[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    let text = textContent.items.map((item: any) => item.str).join(' ');

    // If text is empty or very sparse, try OCR (Scanned PDF handling)
    if (!text.trim() || text.trim().length < 20) {
      console.log(`Page ${i} appears to be scanned/image-only. Attempting OCR...`);
      try {
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas
          }).promise;

          // Convert canvas to blob/url for Tesseract
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve));
          if (blob) {
            const { data: { text: ocrText } } = await Tesseract.recognize(blob, 'eng');
            text = ocrText;
          }
        }
      } catch (err) {
        console.error(`OCR failed for page ${i}:`, err);
        text = "[OCR Failed for Scanned Page]";
      }
    }

    if (text.trim()) {
      records.push(createRecord('pdf', 'study_text', text, {
        page: i,
        file_name: file.name,
        is_scanned: !textContent.items.length
      }));
    }
  }
  return records;
};

const processImage = async (file: File): Promise<UnifiedRecord[]> => {
  const { data: { text } } = await Tesseract.recognize(file, 'eng');

  return [createRecord('image', 'study_text', text, {
    file_name: file.name
  })];
};

// Singleton to manage the potentially large model
class AudioTranscriber {
  static instance: any = null;

  static async getInstance() {
    if (!this.instance) {
      console.log("Loading Whisper model...");
      // Use the multilingual model for better compatibility
      this.instance = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    }
    return this.instance;
  }
}

const processAudio = async (file: File): Promise<UnifiedRecord[]> => {
  try {
    console.log(`[Audio] Starting processing for ${file.name}`);

    // 1. Get the transcriber (loads model if first time)
    const transcriber = await AudioTranscriber.getInstance();
    console.log("[Audio] Transcriber instance ready");

    // 2. Transcribe
    const url = URL.createObjectURL(file);
    console.log(`[Audio] Created URL: ${url}. Starting transcription...`);

    const output = await transcriber(url, {
      chunk_length_s: 30,
      stride_length_s: 5,
      task: 'transcribe'
    });

    console.log("[Audio] Transcription complete. Output:", output);
    URL.revokeObjectURL(url);

    // 3. Create Record
    let text = output.text.trim();

    if (!text) {
      console.warn("[Audio] Transcription yielded empty text.");
      text = "[Audio file processed but no speech was detected]";
    }

    return [createRecord('audio', 'explanation', text, {
      file_name: file.name,
      speaker: "Audio File",
      transcription_method: "browser_local_whisper",
      model: "whisper-tiny.en"
    })];

  } catch (error: any) {
    console.error("[Audio] Transcription failed:", error);
    return [createRecord('audio', 'note', `[Audio Processing Error: ${error.message}]`, {
      file_name: file.name,
      error: true,
      details: String(error)
    })];
  }
};

const processCSV = (file: File): Promise<UnifiedRecord[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const records = results.data.map((row: any) =>
          createRecord('csv', 'log', JSON.stringify(row), {
            file_name: file.name,
            original_row: row
          })
        );
        resolve(records);
      },
      error: reject
    });
  });
};

const processExcel = async (file: File): Promise<UnifiedRecord[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);

  return jsonData.map((row: any) =>
    createRecord('csv', 'log', JSON.stringify(row), { // Treat excel as structured/csv-like
      file_name: file.name,
      original_row: row
    })
  );
};

const processJSON = async (file: File): Promise<UnifiedRecord[]> => {
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid JSON file');
  }

  const items = Array.isArray(data) ? data : [data];

  // Helper to make JSON readable text
  const formatKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1') // camelCase
      .replace(/_/g, ' ') // snake_case
      .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
      .trim();
  };

  const jsonToReadable = (obj: any, depth = 0): string => {
    if (typeof obj !== 'object' || obj === null) return String(obj);

    const indent = '  '.repeat(depth);
    return Object.entries(obj).map(([key, value]) => {
      const readableKey = formatKey(key);
      if (typeof value === 'object' && value !== null) {
        return `${indent}${readableKey}:\n${jsonToReadable(value, depth + 1)}`;
      }
      return `${indent}${readableKey}: ${value}`;
    }).join('\n');
  };

  return items.map((item: any) =>
    createRecord('api', 'log', JSON.stringify(item), {
      file_name: file.name,
      original_object: item
    })
  ).map(record => ({
    ...record,
    structured_content: jsonToReadable(JSON.parse(record.raw_content || '{}'))
  }));
};

const processText = async (file: File): Promise<UnifiedRecord[]> => {
  const text = await file.text();
  // Split by double newlines to separate paragraphs/sections
  const sections = text.split(/\n\s*\n/);

  return sections.filter(s => s.trim()).map(section =>
    createRecord('text', 'note', section, {
      file_name: file.name
    })
  );
};

export const processLiveRecording = async (blob: Blob): Promise<UnifiedRecord> => {
  // Assuming the blob comes from MediaRecorder
  // Without a backend STT, we can't easily transcribe this blob in browser efficiently.
  // However, if we had the transcript (e.g. from Web Speech API used during recording), we should use that.
  // Here we'll just store the blob metadata or placeholder.
  return createRecord('audio', 'note', `[Live Recording Blob: ${blob.size} bytes]`, {
    file_name: 'live_recording.webm'
  });
};

export const processLiveTranscript = (transcript: string): UnifiedRecord => {
  return createRecord('audio', 'note', transcript, {
    file_name: 'live_transcript.txt',
    source: 'microphone'
  });
};
