import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

export const pdfOperations = {
  async extractText(pdfPath: string, languages = 'eng+ind'): Promise<string> {
    return await invoke('ocr_pdf', {
      pdfPath,
      languages,
      pages: null,
      outputFormat: 'text',
    });
  },

  async convertToWord(inputPath: string, outputPath: string): Promise<string> {
    return await invoke('pdf_to_word', { inputPath, outputPath });
  },

  async convertToImages(inputPath: string, outputDir: string, format = 'png', dpi = 200): Promise<string> {
    return await invoke('pdf_to_images', { inputPath, outputDir, format, dpi });
  },

  async mergePDFs(inputPaths: string[], outputPath: string): Promise<string> {
    return await invoke('merge_pdfs', { inputPaths, outputPath });
  },

  async splitPDF(inputPath: string, outputDir: string, pages: number[]): Promise<string> {
    return await invoke('split_pdf', { inputPath, outputDir, pages });
  },

  async rotatePages(inputPath: string, outputPath: string, rotations: Record<number, number>): Promise<string> {
    return await invoke('rotate_pages', { inputPath, outputPath, rotations });
  },

  async compress(inputPath: string, outputPath: string, quality = 'medium'): Promise<string> {
    try {
      return await invoke('compress_pdf_native', { inputPath, outputPath, quality });
    } catch {
      return await invoke('compress_pdf', { inputPath, outputPath, quality });
    }
  },

  async encrypt(inputPath: string, outputPath: string, password: string): Promise<string> {
    return await invoke('encrypt_pdf', { inputPath, outputPath, password });
  },

  async decrypt(inputPath: string, outputPath: string, password: string): Promise<string> {
    return await invoke('decrypt_pdf', { inputPath, outputPath, password });
  },

  async getSecurityInfo(pdfPath: string): Promise<any> {
    const result = await invoke('get_pdf_security_info', { pdfPath });
    return JSON.parse(result as string);
  },

  async validatePDF(pdfPath: string): Promise<boolean> {
    return await invoke('validate_pdf_file', { pdfPath });
  },

  async getPDFVersion(pdfPath: string): Promise<string> {
    return await invoke('get_pdf_version_info', { pdfPath });
  },

  async getPDFInfo(pdfPath: string): Promise<any> {
    const result = await invoke('get_pdf_info', { pdfPath });
    return JSON.parse(result as string);
  },

  async selectPDFFile(): Promise<string | null> {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'PDF',
        extensions: ['pdf']
      }]
    });
    return selected as string | null;
  },

  async selectMultiplePDFs(): Promise<string[] | null> {
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'PDF',
        extensions: ['pdf']
      }]
    });
    return selected as string[] | null;
  },

  async selectOutputPath(defaultName: string): Promise<string | null> {
    const selected = await save({
      defaultPath: defaultName,
      filters: [{
        name: 'PDF',
        extensions: ['pdf']
      }]
    });
    return selected;
  },

  async selectFolder(): Promise<string | null> {
    const selected = await open({
      directory: true,
    });
    return selected as string | null;
  },
};
