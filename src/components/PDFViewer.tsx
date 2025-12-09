import { useState, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Download,
  Printer,
  FileText,
  Moon,
  Sun,
} from 'lucide-react';
import '../styles/PDFViewer.css';

interface PDFViewerProps {
  pdfPath: string;
  fileName: string;
}

const PDFViewer = ({ pdfPath, fileName }: PDFViewerProps) => {
  const [currentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [pageImages, setPageImages] = useState<{[key: number]: string}>({});
  const [thumbnails, setThumbnails] = useState<{[key: number]: string}>({});
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  useEffect(() => {
    // Apply dark mode class to pdf-viewer container
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    loadPDFInfo();
  }, [pdfPath]);

  useEffect(() => {
    // Load all page images when PDF is loaded
    if (totalPages > 0) {
      loadAllPageImages();
    }
  }, [totalPages]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const loadPDFInfo = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('get_pdf_info', { pdfPath });
      const resultStr = String(result);
      const cleanJson = resultStr.trim().split('\n').filter(line => line.trim()).pop() || resultStr;
      const info = JSON.parse(cleanJson);
      setTotalPages(info.page_count);
      
      // Load all thumbnails
      loadAllThumbnails();
    } catch (error) {
      console.error('Failed to load PDF info:', error);
    }
  };

  const loadAllThumbnails = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('get_pdf_thumbnails', { pdfPath });
      const resultStr = String(result);
      const cleanJson = resultStr.trim().split('\n').filter(line => line.trim()).pop() || resultStr;
      const data = JSON.parse(cleanJson);
      
      if (data.type === 'success' && data.thumbnails) {
        const thumbMap: {[key: number]: string} = {};
        data.thumbnails.forEach((thumb: any) => {
          thumbMap[thumb.page] = thumb.thumbnail;
        });
        setThumbnails(thumbMap);
      }
    } catch (error) {
      console.error('Failed to load thumbnails:', error);
    }
  };

  const loadAllPageImages = async () => {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      loadPageImage(pageNum);
    }
  };

  const loadPageImage = async (pageNum: number) => {
    if (pageImages[pageNum]) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('get_pdf_page_image', { 
        pdfPath, 
        pageNumber: pageNum,
        scale: 0.8 
      });
      const resultStr = String(result);
      const cleanJson = resultStr.trim().split('\n').filter(line => line.trim()).pop() || resultStr;
      const data = JSON.parse(cleanJson);
      
      if (data.type === 'success' && data.image) {
        setPageImages(prev => ({
          ...prev,
          [pageNum]: data.image
        }));
      }
    } catch (error) {
      console.error('Failed to load page image:', error);
    }
  };

  const scrollToPage = (pageNum: number) => {
    const element = document.getElementById(`page-${pageNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(200, prev + 25));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(50, prev - 25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  return (
    <div className="pdf-viewer-container">
      <div className="viewer-header">
        <div className="file-info-section">
          <FileText className="file-icon" size={24} />
          <div className="file-details">
            <h2 className="file-name">{fileName}</h2>
            <span className="file-meta">{totalPages} pages • {pdfPath}</span>
          </div>
        </div>

        <div className="viewer-actions">
          <button className="action-btn" onClick={toggleDarkMode} title={isDarkMode ? "Light Mode" : "Dark Mode"}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="action-btn" title="Download">
            <Download size={18} />
          </button>
          <button className="action-btn" title="Print">
            <Printer size={18} />
          </button>
        </div>
      </div>

      <div className="viewer-toolbar">
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={handleZoomOut} title="Zoom out">
            <ZoomOut size={18} />
          </button>
          <span className="zoom-display">{zoom}%</span>
          <button className="toolbar-btn" onClick={handleZoomIn} title="Zoom in">
            <ZoomIn size={18} />
          </button>
          <button className="toolbar-btn" onClick={handleRotate} title="Rotate">
            <RotateCw size={18} />
          </button>
        </div>
      </div>

      <div className="viewer-content">
        <div className="pdf-pages-scroll">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div 
              key={pageNum} 
              id={`page-${pageNum}`}
              className="pdf-page-container"
            >
              <div className="page-number-label">Page {pageNum}</div>
              <div className="pdf-page-wrapper" style={{ transform: `scale(${zoom / 100})` }}>
                {pageImages[pageNum] ? (
                  <img 
                    src={pageImages[pageNum]} 
                    alt={`Page ${pageNum}`}
                    className="pdf-page-image"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                ) : (
                  <div className="pdf-page-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading page {pageNum}...</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-thumbnails">
        <div className="thumbnails-header">
          <h3>PAGES</h3>
        </div>
        <div className="thumbnails-grid">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              className={`thumbnail-item ${pageNum === currentPage ? 'active' : ''}`}
              onClick={() => scrollToPage(pageNum)}
            >
              <div className="thumbnail-preview">
                {thumbnails[pageNum] ? (
                  <img src={thumbnails[pageNum]} alt={`Page ${pageNum}`} className="thumbnail-image" />
                ) : (
                  <span>{pageNum}</span>
                )}
              </div>
              <span className="thumbnail-label">Page {pageNum}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
