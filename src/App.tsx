import { useState, useEffect } from "react";
import FileUploader from './components/FileUploader';
import PDFToolbar from './components/PDFToolbar';
import FileHistory from './components/FileHistory';
import PDFEditor from './components/PDFEditor';
import PDFViewer from './components/PDFViewer';
import DocumentManager from './components/DocumentManager';
import { Moon, Sun, FileText, Edit3, Clock, Eye, FolderOpen } from 'lucide-react';
import "./App.css";

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [operationResult, setOperationResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'tools' | 'edit' | 'history' | 'preview' | 'documents'>('preview');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  useEffect(() => {
    if (selectedFiles.length > 0 && selectedFiles[0]) {
      addToHistory(selectedFiles[0]);
    }
  }, [selectedFiles]);

  const addToHistory = (path: string) => {
    const saved = localStorage.getItem('file_history');
    const history = saved ? JSON.parse(saved) : [];
    
    const name = path.split('\\').pop() || path.split('/').pop() || path;
    const newItem = {
      path,
      name,
      timestamp: Date.now(),
    };

    const updated = [newItem, ...history.filter((h: any) => h.path !== path)].slice(0, 50);
    localStorage.setItem('file_history', JSON.stringify(updated));
  };

  const handleFilesSelected = (files: string[]) => {
    setSelectedFiles(files);
    if (files.length > 0) {
      setCurrentFile(files[0]);
    }
  };

  const handleFileFromHistory = (path: string) => {
    setSelectedFiles([path]);
    setCurrentFile(path);
    setActiveTab('tools');
  };

  const handleOperationComplete = (result: any) => {
    setOperationResult(result);
    
    // Don't show alert for compress operation (already handled in PDFToolbar)
    if (result.type !== 'compress') {
      alert(`Operation completed: ${result.type}`);
    }
  };

  const handleEditorSave = async (pages: any[]) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      const rotations: { [key: number]: number } = {};
      pages.forEach((page) => {
        if (page.rotation !== 0) {
          rotations[page.number] = page.rotation;
        }
      });

      if (Object.keys(rotations).length > 0 && currentFile) {
        const outputPath = currentFile.replace('.pdf', '_edited.pdf');
        await invoke('rotate_pages', {
          inputPath: currentFile,
          outputPath,
          rotations,
        });
        alert('Pages rotated successfully!');
      }

      const pagesToDelete = Array.from({ length: pages.length }, (_, i) => i + 1)
        .filter(num => !pages.some(p => p.number === num));

      if (pagesToDelete.length > 0 && currentFile) {
        const outputPath = currentFile.replace('.pdf', '_edited.pdf');
        await invoke('delete_pages', {
          inputPath: currentFile,
          outputPath,
          pagesToDelete,
        });
        alert('Pages deleted successfully!');
      }

    } catch (error) {
      alert(`Failed to save: ${error}`);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className="app paperless-layout">
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-logo">
            <FileText size={24} />
            PDF Processor
          </h1>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <button
              className={`nav-item ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
              disabled={!currentFile}
            >
              <Eye size={18} />
              <span>Preview</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'tools' ? 'active' : ''}`}
              onClick={() => setActiveTab('tools')}
            >
              <FileText size={18} />
              <span>PDF Tools</span>
            </button>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">MANAGE</div>
            <button
              className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              <FolderOpen size={18} />
              <span>Document Manager</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'edit' ? 'active' : ''}`}
              onClick={() => setActiveTab('edit')}
              disabled={!currentFile}
            >
              <Edit3 size={18} />
              <span>Edit Pages</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <Clock size={18} />
              <span>Recent Files</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle-sidebar" onClick={toggleDarkMode} title="Toggle theme">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>{darkMode ? 'Light' : 'Dark'} Mode</span>
          </button>
          <span className="version-text">v0.1.0</span>
        </div>
      </aside>

      <div className="app-main-container">
        <header className="top-header">
          <div className="header-left">
            <h2 className="page-title">
              {activeTab === 'preview' && 'Document Preview'}
              {activeTab === 'tools' && 'PDF Tools'}
              {activeTab === 'documents' && 'Document Manager'}
              {activeTab === 'edit' && 'Edit PDF'}
              {activeTab === 'history' && 'Recent Files'}
            </h2>
          </div>
          <div className="header-right">
            {selectedFiles.length > 0 && (
              <span className="files-count">{selectedFiles.length} file(s) selected</span>
            )}
          </div>
        </header>

        <main className="main-content-area">
          {selectedFiles.length === 0 ? (
            <FileUploader onFilesSelected={handleFilesSelected} />
          ) : (
            <>
              {activeTab === 'preview' && currentFile ? (
                <PDFViewer 
                  pdfPath={currentFile}
                  fileName={currentFile.split('\\').pop() || currentFile.split('/').pop() || currentFile}
                />
              ) : activeTab === 'edit' && currentFile ? (
                <PDFEditor 
                  pdfPath={currentFile}
                  onSave={handleEditorSave}
                />
              ) : activeTab === 'documents' ? (
                <div className="documents-container">
                  <DocumentManager />
                </div>
              ) : activeTab === 'history' ? (
                <div className="history-container">
                  <FileHistory onFileSelect={handleFileFromHistory} />
                </div>
              ) : activeTab === 'tools' ? (
                <div className="tools-layout">
                  <div className="tools-sidebar">
                    <PDFToolbar 
                      selectedFile={currentFile}
                      onOperationComplete={handleOperationComplete}
                    />
                  </div>
                  <div className="tools-content">
                    <div className="file-viewer">
                      <div className="file-grid">
                        {selectedFiles.map((file, index) => (
                          <div 
                            key={index}
                            className={`file-card ${file === currentFile ? 'selected' : ''}`}
                            onClick={() => setCurrentFile(file)}
                          >
                            <div className="file-icon">
                              <FileText size={48} />
                            </div>
                            <div className="file-info-card">
                              <h4 className="file-name">{file.split('\\').pop() || file.split('/').pop()}</h4>
                              <p className="file-path-small">{file}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button 
                        className="btn-add-files"
                        onClick={async () => {
                          const { tauriAPI } = await import('./utils/tauri');
                          const files = await tauriAPI.selectPDFFiles();
                          if (files) {
                            const combined = [...selectedFiles, ...files];
                            handleFilesSelected(combined);
                          }
                        }}
                      >
                        + Add More Files
                      </button>

                      {operationResult && (
                        <div className="result-box">
                          <h3>Operation Result</h3>
                          {operationResult.type === 'compress' ? (
                            <div className="compress-result">
                              <p><strong>✅ PDF Compressed Successfully!</strong></p>
                              <p>📄 Original Size: {(() => {
                                const bytes = operationResult.result?.result?.original_size || 0;
                                const k = 1024;
                                const sizes = ['B', 'KB', 'MB', 'GB'];
                                const i = Math.floor(Math.log(bytes) / Math.log(k));
                                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                              })()}</p>
                              <p>📦 Compressed Size: {(() => {
                                const bytes = operationResult.result?.result?.compressed_size || 0;
                                const k = 1024;
                                const sizes = ['B', 'KB', 'MB', 'GB'];
                                const i = Math.floor(Math.log(bytes) / Math.log(k));
                                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                              })()}</p>
                              <p>📊 Compression Ratio: {operationResult.result?.result?.compression_ratio || '0%'}</p>
                              <p>💾 Output: {operationResult.result?.result?.output || 'Unknown'}</p>
                            </div>
                          ) : (
                            <pre>{JSON.stringify(operationResult, null, 2)}</pre>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
