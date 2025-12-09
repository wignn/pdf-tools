import { useState, useEffect, useMemo } from 'react';
import { Search, FileText, Calendar, FolderOpen, Trash2, RefreshCw, Plus } from 'lucide-react';
import type { DocumentRecord } from '../types';
import { getDocuments, deleteDocument, getDocumentStats, formatFileSize, parseTags, saveDocument } from '../utils/documentStorage';
import { tauriAPI } from '../utils/tauri';
import '../styles/DocumentManager.css';

const DocumentManager = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [stats, setStats] = useState({ total_documents: 0, total_size_bytes: 0 });

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const s = await getDocumentStats();
      setStats(s);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Don't show error to user for stats, just log it
      // Set default stats
      setStats({ total_documents: 0, total_size_bytes: 0 });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await deleteDocument(id);
      await loadDocuments();
      await loadStats();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    }
  };

  const handleRefresh = () => {
    loadDocuments();
    loadStats();
  };

  const handleAddDocument = async () => {
    try {
      // Select PDF file
      const files = await tauriAPI.selectPDFFiles();
      if (!files || files.length === 0) return;

      const filePath = files[0];
      const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || filePath;

      // Get PDF info
      const pdfInfo = await tauriAPI.getPDFInfo(filePath);

      // Get file size
      const fileStats = await tauriAPI.getFileStats(filePath);

      // Create document record
      const doc: DocumentRecord = {
        title: fileName.replace('.pdf', ''),
        file_name: fileName,
        file_path: filePath,
        storage_path: filePath,
        file_size: fileStats.size,
        page_count: pdfInfo.page_count,
        document_type: 'PDF',
        date_created: new Date().toISOString(),
        tags: '',
        notes: '',
      };

      // Save to database
      await saveDocument(doc);
      
      // Reload documents
      await loadDocuments();
      await loadStats();
      
      alert(`Document "${fileName}" added successfully!`);
    } catch (error) {
      console.error('Failed to add document:', error);
      alert('Failed to add document: ' + error);
    }
  };

  // Fast client-side filtering using useMemo
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = !searchQuery || 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.file_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = !selectedType || doc.document_type === selectedType;
      
      return matchesSearch && matchesType;
    });
  }, [documents, searchQuery, selectedType]);

  // Get unique document types for filter
  const documentTypes = useMemo(() => {
    const types = new Set(documents.map(d => d.document_type).filter(Boolean));
    return Array.from(types);
  }, [documents]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="document-manager">
      <div className="manager-header">
        <h1 className="manager-title">Document Library</h1>
        <div className="stats-bar">
          <div className="stat-item">
            <FileText size={16} />
            <span>{stats.total_documents} documents</span>
          </div>
          <div className="stat-item">
            <FolderOpen size={16} />
            <span>{formatFileSize(stats.total_size_bytes)}</span>
          </div>
        </div>
      </div>

      <div className="manager-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="type-filter"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          aria-label="Filter by document type"
        >
          <option value="">All Types</option>
          {documentTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <button className="btn-add-doc" onClick={handleAddDocument} title="Add Document">
          <Plus size={18} />
          <span>Add Document</span>
        </button>

        <button className="btn-refresh" onClick={handleRefresh} disabled={loading} title="Refresh" aria-label="Refresh documents">
          <RefreshCw size={18} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="documents-list">
        {loading && documents.length === 0 ? (
          <div className="empty-state">
            <div className="spinner"></div>
            <p>Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>No documents found</p>
            <small>Click "Add Document" to add PDFs to your library</small>
          </div>
        ) : (
          <div className="documents-grid">
            {filteredDocuments.map(doc => (
              <div key={doc.id} className="document-card">
                <div className="doc-header">
                  <FileText size={20} />
                  <button
                    className="btn-delete"
                    onClick={() => doc.id && handleDelete(doc.id)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="doc-body">
                  <h3 className="doc-title" title={doc.title}>{doc.title}</h3>
                  <p className="doc-filename">{doc.file_name}</p>
                  
                  <div className="doc-meta">
                    <div className="meta-row">
                      <Calendar size={14} />
                      <span>{formatDate(doc.date_created)}</span>
                    </div>
                    <div className="meta-row">
                      <FileText size={14} />
                      <span>{doc.page_count} pages · {formatFileSize(doc.file_size)}</span>
                    </div>
                  </div>

                  {doc.document_type && (
                    <span className="doc-type-badge">{doc.document_type}</span>
                  )}

                  {doc.tags && parseTags(doc.tags).length > 0 && (
                    <div className="doc-tags">
                      {parseTags(doc.tags).slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="doc-footer">
                  <button className="btn-open" onClick={() => {
                    // Open document in editor
                    console.log('Open document:', doc.file_path);
                  }}>
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentManager;
