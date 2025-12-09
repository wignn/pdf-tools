import { invoke } from '@tauri-apps/api/core';
import type { DocumentRecord, DocumentStats, DocumentFilter } from '../types';

/**
 * Fast document storage API using Rust + SQLite
 * Optimized with WAL mode, indexes, and connection pooling
 */

export async function saveDocument(doc: DocumentRecord): Promise<number> {
  try {
    const id = await invoke<number>('save_document', { doc });
    return id;
  } catch (error) {
    console.error('Failed to save document:', error);
    throw error;
  }
}

export async function getDocuments(filter?: DocumentFilter): Promise<DocumentRecord[]> {
  try {
    const documents = await invoke<DocumentRecord[]>('get_documents', {
      search: filter?.search || null,
      documentType: filter?.document_type || null,
      limit: filter?.limit || null,
      offset: filter?.offset || null,
    });
    return documents;
  } catch (error) {
    console.error('Failed to get documents:', error);
    throw error;
  }
}

export async function getDocumentById(id: number): Promise<DocumentRecord> {
  try {
    const document = await invoke<DocumentRecord>('get_document_by_id', { id });
    return document;
  } catch (error) {
    console.error('Failed to get document:', error);
    throw error;
  }
}

export async function updateDocument(id: number, doc: DocumentRecord): Promise<void> {
  try {
    await invoke('update_document', { id, doc });
  } catch (error) {
    console.error('Failed to update document:', error);
    throw error;
  }
}

export async function deleteDocument(id: number): Promise<void> {
  try {
    await invoke('delete_document', { id });
  } catch (error) {
    console.error('Failed to delete document:', error);
    throw error;
  }
}

export async function getDocumentStats(): Promise<DocumentStats> {
  try {
    const stats = await invoke<DocumentStats>('get_document_stats');
    return stats;
  } catch (error) {
    console.error('Failed to get document stats:', error);
    throw error;
  }
}

/**
 * Helper to format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Helper to parse tags from JSON string
 */
export function parseTags(tagsJson: string): string[] {
  try {
    return JSON.parse(tagsJson);
  } catch {
    return [];
  }
}

/**
 * Helper to stringify tags to JSON
 */
export function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags);
}
