export interface PDFFile {
  id: string;
  name: string;
  path: string;
  size: number;
  pageCount?: number;
}

export interface ProcessingTask {
  id: string;
  type: 'ocr' | 'merge' | 'split' | 'convert' | 'compress' | 'watermark' | 'encrypt';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
  files: PDFFile[];
}

export interface OCROptions {
  languages: string[];
  pages?: number[];
  outputFormat: 'txt' | 'json' | 'docx';
}

export interface ConversionOptions {
  format: 'word' | 'powerpoint' | 'excel' | 'image';
  imageFormat?: 'png' | 'jpg';
  imageDPI?: number;
}

export interface EditorOptions {
  rotate?: { [page: number]: number };
  deletePages?: number[];
  watermark?: {
    text: string;
    position: 'center' | 'top' | 'bottom';
  };
  compression?: 'low' | 'medium' | 'high';
  password?: string;
}

export interface DocumentRecord {
  id?: number;
  title: string;
  file_path: string;
  file_name: string;
  file_size: number;
  page_count: number;
  archive_serial?: string;
  date_created: string;
  correspondent?: string;
  document_type?: string;
  storage_path: string;
  tags: string; // JSON string
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentStats {
  total_documents: number;
  total_size_bytes: number;
}

export interface DocumentFilter {
  search?: string;
  document_type?: string;
  limit?: number;
  offset?: number;
}
