import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { AnalysisResult, ColumnAnalysis, IngestionMetadata } from '../types';

let lastProcessedData: any[] = [];

export const getLastProcessedData = () => lastProcessedData;

export const processFile = async (file: File): Promise<AnalysisResult> => {
  const fileType = file.name.split('.').pop()?.toLowerCase() as 'csv' | 'xlsx' | 'json';
  let data: any[] = [];

  try {
    if (fileType === 'csv') {
      data = await parseCSV(file);
    } else if (fileType === 'xlsx') {
      data = await parseXLSX(file);
    } else if (fileType === 'json') {
      data = await parseJSON(file);
    } else {
      throw new Error('Unsupported file type');
    }

    if (data.length === 0) {
      throw new Error('File contains no data');
    }

    lastProcessedData = data;
    return analyzeData(data, file);
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
};

const parseCSV = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

const parseXLSX = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

const parseJSON = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          resolve(json);
        } else {
          // Handle object (maybe wrap in array or reject?)
          // Assuming array of objects for ingestion
          resolve([json]); 
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

const analyzeData = (data: any[], file: File): AnalysisResult => {
  const totalRows = data.length;
  // Get all unique keys from all objects to handle sparse data
  const keys = Array.from(new Set(data.flatMap(Object.keys)));
  const totalColumns = keys.length;

  const columns: ColumnAnalysis[] = keys.map(key => {
    const values = data.map(row => row[key]);
    const type = detectType(values);
    const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
    const nullPercentage = (nullCount / totalRows) * 100;
    
    // Get a sample non-null value
    const sampleValue = values.find(v => v !== null && v !== undefined && v !== '');

    return {
      name: key,
      type,
      nullPercentage,
      sampleValues: sampleValue !== undefined ? [sampleValue] : []
    };
  });

  const metadata: IngestionMetadata = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.name.split('.').pop()?.toLowerCase() as 'csv' | 'xlsx' | 'json',
    totalRows,
    totalColumns,
    uploadTimestamp: new Date().toISOString(),
    encoding: 'UTF-8', // Browser FileReader typically handles UTF-8
    source: 'manual'
  };

  return {
    metadata,
    columns
  };
};

const detectType = (values: any[]): string => {
  let isInteger = true;
  let isFloat = true;
  let isBoolean = true;
  let isDate = true;
  let hasValue = false;

  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    hasValue = true;

    if (typeof value === 'boolean') {
        isInteger = false;
        isFloat = false;
        isDate = false;
        continue;
    }

    if (typeof value === 'number') {
        isDate = false;
        isBoolean = false;
        if (!Number.isInteger(value)) {
            isInteger = false;
        }
        continue;
    }

    const strVal = String(value).trim();
    
    // Check Boolean
    if (!['true', 'false', '0', '1', 'yes', 'no'].includes(strVal.toLowerCase())) {
        isBoolean = false;
    }

    // Check Number
    if (isNaN(Number(strVal)) || strVal === '') {
        isInteger = false;
        isFloat = false;
    } else {
        if (!Number.isInteger(Number(strVal))) {
            isInteger = false;
        }
    }

    // Check Date
    const date = new Date(strVal);
    if (strVal.length < 10 || isNaN(date.getTime()) || !/^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/.test(strVal)) {
         // simplistic date check to avoid false positives on simple numbers
         isDate = false;
    }
  }

  if (!hasValue) return 'String';
  if (isBoolean) return 'Boolean';
  if (isInteger) return 'Integer';
  if (isFloat) return 'Float';
  if (isDate) return 'Date';

  return 'String';
};
