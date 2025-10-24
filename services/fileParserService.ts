
import type { DatasetRecord } from '../types';

declare const xlsx: any;
declare const mammoth: any;
declare const Papa: any;

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
};

export const parseDatasetFile = async (file: File): Promise<DatasetRecord[]> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
        case 'csv': {
            const text = await readFileAsText(file);
            return new Promise((resolve, reject) => {
                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results: { data: DatasetRecord[] }) => resolve(results.data),
                    error: (error: Error) => reject(error),
                });
            });
        }
        case 'json': {
            const text = await readFileAsText(file);
            const data = JSON.parse(text);
            return Array.isArray(data) ? data : [data];
        }
        case 'xlsx':
        case 'ods': {
            const buffer = await readFileAsArrayBuffer(file);
            const workbook = xlsx.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            return xlsx.utils.sheet_to_json(worksheet);
        }
        case 'txt': {
            const text = await readFileAsText(file);
            return text.split('\n').filter(line => line.trim()).map(line => ({ text: line }));
        }
        default:
            throw new Error(`Unsupported dataset file type: ${extension}`);
    }
};


export const parseTemplateFile = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch(extension) {
        case 'txt':
        case 'md':
        case 'markdown':
            return readFileAsText(file);
        case 'docx': {
            const buffer = await readFileAsArrayBuffer(file);
            const result = await mammoth.extractRawText({ arrayBuffer: buffer });
            return result.value;
        }
        default:
             throw new Error(`Unsupported template file type: ${extension}`);
    }
};
