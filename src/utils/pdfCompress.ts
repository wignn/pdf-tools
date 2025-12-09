import { PDFDocument } from 'pdf-lib';
import * as fs from '@tauri-apps/plugin-fs';

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: string;
  quality: number;
  method: string;
}

export async function compressPDF(
  inputPath: string,
  outputPath: string,
  quality: number = 75
): Promise<CompressionResult> {
  try {
    console.log('[pdfCompress] Starting compression:', { inputPath, outputPath });
    
    console.log('[pdfCompress] Reading input file...');
    const inputBytes = await fs.readFile(inputPath);
    const originalSize = inputBytes.length;
    console.log('[pdfCompress] Input file read:', originalSize, 'bytes');

    console.log('[pdfCompress] Loading PDF document...');
    const pdfDoc = await PDFDocument.load(inputBytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    console.log('[pdfCompress] PDF loaded successfully');

    console.log('[pdfCompress] Saving compressed PDF...');
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,    
      addDefaultPage: false,        
      objectsPerTick: 50,           
    });
    console.log('[pdfCompress] PDF compressed:', compressedBytes.length, 'bytes');

    console.log('[pdfCompress] Writing output file to:', outputPath);
    await fs.writeFile(outputPath, compressedBytes);
    console.log('[pdfCompress] Output file written successfully');

    const compressedSize = compressedBytes.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    return {
      originalSize,
      compressedSize,
      compressionRatio: `${ratio}%`,
      quality,
      method: 'pdf-lib',
    };
  } catch (error) {
    console.error('[pdfCompress] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`PDF compression failed: ${errorMessage}`);
  }
}
