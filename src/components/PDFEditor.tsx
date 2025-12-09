import { useState, useEffect } from 'react';
import { RotateCw, GripVertical, Save, ChevronLeft, ChevronRight, Check, Pencil, X } from 'lucide-react';
import { saveDocument, stringifyTags } from '../utils/documentStorage';
import type { DocumentRecord } from '../types';
import '../styles/PDFEditor.css';


interface PDFPage {
  number: number;
  rotation: number;
  thumbnail?: string;
}

interface PDFEditorProps {
  pdfPath: string;
  onSave: (pages: PDFPage[]) => void;
}

const PDFEditor = ({ pdfPath }: PDFEditorProps) => {
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [draggedPage, setDraggedPage] = useState<number | null>(null);
  const [dragOverPage, setDragOverPage] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'content' | 'metadata' | 'notes' | 'history' | 'permissions'>('details');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [pdfMetadata, setPdfMetadata] = useState({
    title: '',
    archiveSerial: '',
    dateCreated: '',
    correspondent: '',
    documentType: '',
    storagePath: 'Default',
    tags: [] as string[],
  });
  const [ocrText, setOcrText] = useState<string>('');
  const [isLoadingOcr, setIsLoadingOcr] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<number | null>(null);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedOcrText, setEditedOcrText] = useState<string>('');

  useEffect(() => {
    loadPDF();
  }, [pdfPath]);

  const loadPDF = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      const result = await invoke('get_pdf_info', { pdfPath });

      const resultStr = result as string;
      const cleanInfoJson = resultStr.trim().split('\n').filter(line => line.trim()).pop() || resultStr;
      const info = JSON.parse(cleanInfoJson);
      
      const fileName = info.file_name || pdfPath.split('\\').pop() || pdfPath.split('/').pop() || '';
      const creationDate = info.creation_date ? parsePDFDate(info.creation_date) : '';
      
      setPdfMetadata({
        title: info.title || fileName.replace('.pdf', ''),
        archiveSerial: '', // Auto-generated
        dateCreated: creationDate,
        correspondent: info.author || '',
        documentType: info.subject || '',
        storagePath: 'Default',
        tags: [],
      });
      
      const thumbnailResult = await invoke('get_pdf_thumbnails', { pdfPath });
      const thumbnailStr = thumbnailResult as string;
      const cleanThumbJson = thumbnailStr.trim().split('\n').filter(line => line.trim()).pop() || thumbnailStr;
      const thumbnailData = JSON.parse(cleanThumbJson);
      
      if (thumbnailData.type === 'error') {
        console.error('Thumbnail generation error:', thumbnailData.message);
        alert(`Failed to generate thumbnails: ${thumbnailData.message}`);
        
        const loadedPages: PDFPage[] = [];
        for (let i = 1; i <= info.page_count; i++) {
          loadedPages.push({
            number: i,
            rotation: 0,
          });
        }
        setPages(loadedPages);
        return;
      }
      
      const loadedPages: PDFPage[] = [];
      for (let i = 1; i <= info.page_count; i++) {
        const thumbnailInfo = thumbnailData.thumbnails?.find((t: any) => t.page === i);
        loadedPages.push({
          number: i,
          rotation: 0,
          thumbnail: thumbnailInfo?.thumbnail,
        });
      }
      setPages(loadedPages);
      
      // Auto-extract OCR text
      extractOcrText();
    } catch (error) {
      console.error('Failed to load PDF:', error);
      alert(`Failed to load PDF: ${error}`);
    }
  };

  const parsePDFDate = (pdfDate: string): string => {
    // PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
    // Example: D:20220629120000+07'00'
    if (!pdfDate || !pdfDate.startsWith('D:')) return '';
    
    try {
      const dateStr = pdfDate.substring(2);
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const togglePageSelection = (pageNum: number) => {
    const newSelection = new Set(selectedPages);
    if (newSelection.has(pageNum)) {
      newSelection.delete(pageNum);
    } else {
      newSelection.add(pageNum);
    }
    setSelectedPages(newSelection);
  };

  const rotatePage = (pageNum: number, degrees: number) => {
    setPages(pages.map(p => 
      p.number === pageNum 
        ? { ...p, rotation: (p.rotation + degrees) % 360 }
        : p
    ));
  };

  const handleDragStart = (e: React.DragEvent, pageNum: number) => {

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', pageNum.toString());
    
    setDraggedPage(pageNum);
    setDragOverPage(null);
    
    setTimeout(() => {
      document.body.classList.add('dragging-page');
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, pageNum: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedPage === null || draggedPage === pageNum) {
      return;
    }
    
    if (dragOverPage !== pageNum) {
      setDragOverPage(pageNum);
      console.log('📍 Dragging over page:', pageNum);
    }
  };
  
  const handleDrop = (e: React.DragEvent, targetPageNum: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedPage === null || draggedPage === targetPageNum) {
      console.log('⚠️ Invalid drop - same page or no dragged page');
      return;
    }

    const newPages = [...pages];
    const draggedIdx = newPages.findIndex(p => p.number === draggedPage);
    const targetIdx = newPages.findIndex(p => p.number === targetPageNum);
    
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    const [removed] = newPages.splice(draggedIdx, 1);
    newPages.splice(targetIdx, 0, removed);
    
    setPages(newPages);
    setDragOverPage(null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget;
    const related = e.relatedTarget as Node;
    
    if (target && !target.contains(related)) {
      setDragOverPage(null);
    }
  };

  const saveChanges = async (showSuccessMessage = true) => {
    if (!hasUnsavedChanges || pages.length === 0) {
      return;
    }
    
    setIsSaving(true);
    const pageOrder = pages.map((p) => p.number);
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const timestamp = Date.now();
      const outputPath = pdfPath.replace(/\.pdf$/i, `_reordered_${timestamp}.pdf`);
      
      await invoke('reorder_pdf_pages', {
        inputPath: pdfPath,
        outputPath,
        pageOrder,
      });
      
      await saveDocumentToStorage(outputPath);
      
      setHasUnsavedChanges(false);
      
      if (showSuccessMessage) {
        setToastMessage('✓ Changes saved successfully');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
      
    } catch (error) {
      console.error('❌ Failed to save changes:', error);
      setToastMessage('✗ Failed to save changes');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const saveDocumentToStorage = async (filePath: string) => {
    try {
      const { stat } = await import('@tauri-apps/plugin-fs');
      const fileInfo = await stat(filePath);
      const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || filePath;
      
      const doc: DocumentRecord = {
        title: pdfMetadata.title || fileName.replace('.pdf', ''),
        file_path: filePath,
        file_name: fileName,
        file_size: Number(fileInfo.size),
        page_count: pages.length,
        archive_serial: pdfMetadata.archiveSerial || undefined,
        date_created: pdfMetadata.dateCreated || new Date().toLocaleDateString(),
        correspondent: pdfMetadata.correspondent || undefined,
        document_type: pdfMetadata.documentType || undefined,
        storage_path: pdfMetadata.storagePath || 'Default',
        tags: stringifyTags(pdfMetadata.tags),
        notes: undefined,
      };
      
      await saveDocument(doc);
    } catch (error) {
      console.error('Failed to save to document storage:', error);
    }
  };

  const handleDragEnd = () => {
    document.body.classList.remove('dragging-page');
    
    setDragOverPage(null);
    setDraggedPage(null);
    setHasUnsavedChanges(true);

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    const timeout = setTimeout(() => {
      console.log('⏰ Debounced autosave triggered');
      saveChanges(false);
    }, 3000); 
    
    setSaveTimeout(timeout);
  };

  const extractOcrText = async () => {
    setIsLoadingOcr(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('ocr_pdf', {
        pdfPath,
        languages: 'eng+ind',
        pages: null,
        outputFormat: 'text',
      });
      
      const resultStr = String(result);
      const cleanedJson = resultStr.trim().split('\n').filter(line => line.trim()).pop() || resultStr;
     
      
      const parsed = JSON.parse(cleanedJson);
      if (parsed.type === 'success') {
        setOcrText(parsed.data || '');
      } else {
        alert(`OCR extraction failed: ${parsed.message}`);
      }
    } catch (error) {
      console.error('Failed to extract OCR text:', error);
      alert(`Failed to extract text: ${error}`);
    } finally {
      setIsLoadingOcr(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(ocrText);
      alert('Text copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy text to clipboard');
    }
  };

  const clearOcrText = () => {
    setOcrText('');
  };

  const handleEditClick = () => {
    setEditedOcrText(ocrText);
    setIsEditingContent(true);
  };

  const handleCancelEdit = () => {
    setIsEditingContent(false);
    setEditedOcrText('');
  };

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);
      
      const { invoke } = await import('@tauri-apps/api/core');
      const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const timestamp = Date.now();
      const outputPath = pdfPath.replace(/\.pdf$/i, `_edited_${timestamp}.pdf`);
      
      const oldContentFile = `old_content_${timestamp}.txt`;
      const newContentFile = `new_content_${timestamp}.txt`;
      
      await writeTextFile(oldContentFile, ocrText, { baseDir: BaseDirectory.Temp });
      await writeTextFile(newContentFile, editedOcrText, { baseDir: BaseDirectory.Temp });
      
      const { tempDir } = await import('@tauri-apps/api/path');
      const tempDirPath = await tempDir();
      const oldContentPath = `${tempDirPath}${oldContentFile}`;
      const newContentPath = `${tempDirPath}${newContentFile}`;
      
      const result = await invoke('update_pdf_text', {
        inputPath: pdfPath,
        outputPath,
        oldContent: oldContentPath,
        newContent: newContentPath,
      });
      
      const resultStr = result as string;
      const cleanJson = resultStr.trim().split('\n').filter(line => line.trim()).pop() || resultStr;
      const parsed = JSON.parse(cleanJson);
      
      if (parsed.type === 'success') {
        setOcrText(editedOcrText);
        setIsEditingContent(false);
        
        setToastMessage(`✓ PDF saved: ${outputPath.split('\\').pop() || outputPath.split('/').pop()} (${parsed.total_replacements || 0} changes)`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
        
        console.log('PDF updated successfully:', parsed);
      } else {
        throw new Error(parsed.message || 'Failed to update PDF');
      }
    } catch (error) {
      console.error('Failed to save content:', error);
      setToastMessage(`✗ Failed to save: ${error}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const fileName = pdfPath.split('\\').pop() || pdfPath.split('/').pop() || pdfPath;

  return (
    <div className="pdf-editor-layout">
      <div className="editor-sidebar-metadata">
        <div className="document-title-header">
          <h2 className="document-title">
            {fileName}
            {hasUnsavedChanges && <span className="unsaved-indicator" title="Unsaved changes"> *</span>}
          </h2>
          <div className="document-actions-top">
            <button className="btn-icon" title="Previous"><ChevronLeft size={20} /></button>
            <button className="btn-icon" title="Next"><ChevronRight size={20} /></button>
            <button 
              className={`btn-icon ${hasUnsavedChanges ? 'btn-primary' : ''}`}
              title={hasUnsavedChanges ? "Save changes" : "No changes to save"}
              onClick={() => saveChanges(true)}
              disabled={!hasUnsavedChanges || isSaving}
            >
              <Save size={20} />
            </button>
          </div>
        </div>

        <div className="metadata-tabs">
          <button 
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button 
            className={`tab ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            Content
          </button>
          <button 
            className={`tab ${activeTab === 'metadata' ? 'active' : ''}`}
            onClick={() => setActiveTab('metadata')}
          >
            Metadata
          </button>
          <button 
            className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Notes
          </button>
          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
          <button 
            className={`tab ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            Permissions
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'details' && (
            <div className="details-form">
              <div className="form-group">
                <label>Title</label>
                <input 
                  type="text" 
                  value={pdfMetadata.title}
                  onChange={(e) => setPdfMetadata({...pdfMetadata, title: e.target.value})}
                  placeholder="Document title"
                />
              </div>

              <div className="form-group">
                <label>Archive serial number</label>
                <div className="input-with-btn">
                  <input 
                    type="text" 
                    value={pdfMetadata.archiveSerial}
                    onChange={(e) => setPdfMetadata({...pdfMetadata, archiveSerial: e.target.value})}
                    placeholder="Auto"
                  />
                  <button className="btn-add">+1</button>
                </div>
              </div>

              <div className="form-group">
                <label>Date created</label>
                <input 
                  type="date" 
                  value={pdfMetadata.dateCreated}
                  onChange={(e) => setPdfMetadata({...pdfMetadata, dateCreated: e.target.value})}
                />
                <small className="suggestion">Suggestions: <span className="link">09/09/2020</span></small>
              </div>

              <div className="form-group">
                <label>Correspondent</label>
                <select 
                  value={pdfMetadata.correspondent}
                  onChange={(e) => setPdfMetadata({...pdfMetadata, correspondent: e.target.value})}
                >
                  <option value="">Select...</option>
                </select>
              </div>

              <div className="form-group">
                <label>Document type</label>
                <select 
                  value={pdfMetadata.documentType}
                  onChange={(e) => setPdfMetadata({...pdfMetadata, documentType: e.target.value})}
                >
                  <option value="">Select...</option>
                </select>
              </div>

              <div className="form-group">
                <label>Storage path</label>
                <select 
                  value={pdfMetadata.storagePath}
                  onChange={(e) => setPdfMetadata({...pdfMetadata, storagePath: e.target.value})}
                >
                  <option value="Default">Default</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tags</label>
                <div className="tags-input">
                  <input type="text" placeholder="Add tags..." />
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-action">Discard</button>
                <button className="btn-action">Save & close</button>
                <button className="btn-action primary">Save</button>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="content-panel">
              {isLoadingOcr && !ocrText ? (
                <div className="content-empty-state">
                  <div className="loading-spinner"></div>
                  <p className="help-text">Extracting text from PDF, please wait...</p>
                </div>
              ) : !ocrText ? (
                <div className="content-empty-state">
                  <button onClick={extractOcrText} className="btn-action primary">
                    Extract Document Content
                  </button>
                  <p className="help-text">Click to extract and display all text from this PDF</p>
                </div>
              ) : (
                <>
                  <div className="content-header">
                    <button onClick={extractOcrText} className="btn-small" disabled={isLoadingOcr}>
                      {isLoadingOcr ? 'Re-extracting...' : 'Re-extract'}
                    </button>
                    <button className="btn-small" onClick={copyToClipboard}>Copy All</button>
                    <button className="btn-small" onClick={clearOcrText}>Clear</button>
                    
                    {!isEditingContent ? (
                      <button className="btn-small" onClick={handleEditClick}>
                        <Pencil size={16} /> Edit
                      </button>
                    ) : (
                      <>
                        <button className="btn-small primary" onClick={handleSaveEdit}>
                          <Check size={16} /> Save
                        </button>
                        <button className="btn-small" onClick={handleCancelEdit}>
                          <X size={16} /> Cancel
                        </button>
                      </>
                    )}
                  </div>

                  <div className="content-text-display">
                    {isEditingContent ? (
                      <textarea 
                        className="content-text-edit"
                        value={editedOcrText}
                        onChange={(e) => setEditedOcrText(e.target.value)}
                      />
                    ) : (
                      <pre className="content-text-pre">{ocrText}</pre>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="metadata-panel">
              <p>Metadata tab content</p>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="notes-panel">
              <textarea placeholder="Add notes..." rows={10} />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-panel">
              <p>Document history will appear here</p>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="permissions-panel">
              <p>Permissions settings</p>
            </div>
          )}
        </div>
      </div>

      <div className="editor-main-content">
        <div className="document-viewer">
          <div className="pages-grid-container">
            {pages.map((page, idx) => (
              <div
                key={`page-${idx}`}
                className={`page-card ${selectedPages.has(page.number) ? 'selected' : ''} ${draggedPage === page.number ? 'dragging' : ''} ${dragOverPage === page.number ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, page.number)}
                onDrop={(e) => handleDrop(e, page.number)}
                onDragLeave={handleDragLeave}
                onClick={() => togglePageSelection(page.number)}
              >
                <div 
                  className="page-drag-icon"
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, page.number)}
                  onDragEnd={handleDragEnd}
                  title="Drag to reorder"
                >
                  <GripVertical size={16} />
                </div>
                
                <div className="page-preview-box">
                  <div className="page-content">
                    {page.thumbnail ? (
                      <img 
                        src={page.thumbnail} 
                        alt={`Page ${idx + 1}`}
                        className={`page-thumbnail rotation-${page.rotation}`}
                      />
                    ) : (
                      <div>Page {idx + 1}</div>
                    )}
                  </div>
                </div>

                <div className="page-footer">
                  <span className="page-label">Page {idx + 1}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      rotatePage(page.number, 90);
                    }}
                    className="btn-rotate"
                    title="Rotate 90°"
                  >
                    <RotateCw size={14} />
                  </button>
                </div>

                {selectedPages.has(page.number) && (
                  <div className="selected-indicator">✓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="toast-notification">
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default PDFEditor;
