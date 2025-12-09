import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

export const tauriAPI = {
  async selectPDFFiles(): Promise<string[] | null> {
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'PDF',
        extensions: ['pdf']
      }]
    });
    
    if (!selected) return null;
    return Array.isArray(selected) ? selected : [selected];
  },

  async selectOutputFolder(): Promise<string | null> {
    const selected = await open({
      directory: true,
    });
    
    return selected as string | null;
  },

  async getPDFInfo(pdfPath: string): Promise<any> {
    try {
      const result = await invoke('get_pdf_info', { pdfPath });
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Failed to get PDF info:', error);
      throw error;
    }
  },

  async ocrPDF(
    pdfPath: string,
    languages: string = 'eng+ind',
    pages: number[] | null = null,
    outputFormat: string = 'txt'
  ): Promise<any> {
    try {
      const result = await invoke('ocr_pdf', {
        pdfPath,
        languages,
        pages,
        outputFormat,
      });
      return JSON.parse(result as string);
    } catch (error) {
      console.error('OCR failed:', error);
      throw error;
    }
  },

  async mergePDFs(inputPaths: string[], outputPath: string): Promise<any> {
    try {
      const result = await invoke('merge_pdfs', { inputPaths, outputPath });
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Merge failed:', error);
      throw error;
    }
  },

  async splitPDF(inputPath: string, outputDir: string, pages: number[]): Promise<any> {
    try {
      const result = await invoke('split_pdf', { inputPath, outputDir, pages });
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Split failed:', error);
      throw error;
    }
  },

  async rotatePages(
    inputPath: string,
    outputPath: string,
    rotations: { [key: number]: number }
  ): Promise<any> {
    try {
      const result = await invoke('rotate_pages', { inputPath, outputPath, rotations });
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Rotate failed:', error);
      throw error;
    }
  },

  async deletePages(inputPath: string, outputPath: string, pagesToDelete: number[]): Promise<any> {
    try {
      const result = await invoke('delete_pages', { inputPath, outputPath, pagesToDelete });
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Delete pages failed:', error);
      throw error;
    }
  },

  async compressPDF(inputPath: string, outputPath: string, quality: number): Promise<any> {
    try {
      const result = await invoke('compress_pdf', { inputPath, outputPath, quality });
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Compress failed:', error);
      throw error;
    }
  },

  async addWatermark(
    inputPath: string,
    outputPath: string,
    text: string,
    position: string
  ): Promise<any> {
    try {
      const result = await invoke('add_watermark', { inputPath, outputPath, text, position });
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Watermark failed:', error);
      throw error;
    }
  },

  async encryptPDF(inputPath: string, outputPath: string, password: string): Promise<any> {
    try {
      const result = await invoke('encrypt_pdf', { inputPath, outputPath, password });
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Encrypt failed:', error);
      throw error;
    }
  },

  async decryptPDF(inputPath: string, outputPath: string, password: string): Promise<any> {
    try {
      const result = await invoke('decrypt_pdf', { inputPath, outputPath, password });
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Decrypt failed:', error);
      throw error;
    }
  },

  async pdfToWord(pdfPath: string, outputPath: string): Promise<any> {
    try {
      const result = await invoke('pdf_to_word', { 
        inputPath: pdfPath, 
        outputPath 
      });
      if (!result || result === '') {
        throw new Error('Empty response from pdf_to_word command');
      }
      return JSON.parse(result as string);
    } catch (error) {
      console.error('PDF to Word conversion failed:', error);
      throw error;
    }
  },

  async pdfToImages(
    pdfPath: string,
    outputDir: string,
    format: string = 'png',
    dpi: number = 200
  ): Promise<any> {
    try {
      const result = await invoke('pdf_to_images', { 
        inputPath: pdfPath, 
        outputDir, 
        format, 
        dpi 
      });
      if (!result || result === '') {
        throw new Error('Empty response from pdf_to_images command');
      }
      return JSON.parse(result as string);
    } catch (error) {
      console.error('PDF to Images conversion failed:', error);
      throw error;
    }
  },

  async imagesToPDF(imagePaths: string[], outputPath: string): Promise<any> {
    try {
      const result = await invoke('images_to_pdf', { 
        imagePaths, 
        outputPath 
      });
      if (!result || result === '') {
        throw new Error('Empty response from images_to_pdf command');
      }
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Images to PDF conversion failed:', error);
      throw error;
    }
  },

  async wordToPDF(docxPath: string, outputPath: string): Promise<any> {
    try {
      const result = await invoke('word_to_pdf', { 
        inputPath: docxPath, 
        outputPath 
      });
      if (!result || result === '') {
        throw new Error('Empty response from word_to_pdf command');
      }
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Word to PDF conversion failed:', error);
      throw error;
    }
  },

  async getFileStats(path: string): Promise<{ size: number; is_file: boolean; is_dir: boolean }> {
    try {
      const result = await invoke('get_file_stats', { path });
      return result as { size: number; is_file: boolean; is_dir: boolean };
    } catch (error) {
      console.error('Failed to get file stats:', error);
      throw error;
    }
  },
};
