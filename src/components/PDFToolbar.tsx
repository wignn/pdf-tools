import { useState } from 'react';
import { 
  FileText, 
  Scissors, 
  Merge, 
  RotateCw, 
  Lock, 
  Unlock,
  FileImage,
  FileType,
  Droplets
} from 'lucide-react';
import { tauriAPI } from '../utils/tauri';
import PasswordModal from './PasswordModal';
import SplitModal from './SplitModal';
import RotateModal from './RotateModal';
import '../styles/PDFToolbar.css';

interface PDFToolbarProps {
  selectedFile: string | null;
  onOperationComplete: (result: any) => void;
}

export default function PDFToolbar({ selectedFile, onOperationComplete }: PDFToolbarProps) {
  const [loading, setLoading] = useState(false);
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordAction, setPasswordAction] = useState<'encrypt' | 'decrypt' | null>(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [showRotateModal, setShowRotateModal] = useState(false);

  const handleOCR = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    setActiveOperation('ocr');
    
    try {
      const result = await tauriAPI.ocrPDF(selectedFile, 'eng+ind', null, 'txt');
      onOperationComplete({ type: 'ocr', result });
    } catch (error) {
      alert('OCR failed: ' + error);
    } finally {
      setLoading(false);
      setActiveOperation(null);
    }
  };

  const handleCompress = async () => {
    if (!selectedFile) return;
    const { save } = await import('@tauri-apps/plugin-dialog');
    const defaultPath = selectedFile.replace('.pdf', '_compressed.pdf');
    const outputPath = await save({
      defaultPath,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    
    if (!outputPath) return;
    
    setLoading(true);
    setActiveOperation('compress');
    
    try {
      const { pdfOperations } = await import('../utils/pdfOperations');
      const result = await pdfOperations.compress(selectedFile, outputPath, 50);
      const data = JSON.parse(result);
      
      const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };
      
      const original = formatBytes(data.result.original_size);
      const compressed = formatBytes(data.result.compressed_size);
      const ratio = data.result.compression_ratio;
      
      alert(`Compression Complete!\n\nOriginal: ${original}\nCompressed: ${compressed}\nReduction: ${ratio}\n\nSaved to: ${outputPath}`);
      
      onOperationComplete({ type: 'compress', result: data });
    } catch (error) {
      console.error('[PDFToolbar] Compression failed:', error);
      alert('Compression failed: ' + error);
    } finally {
      setLoading(false);
      setActiveOperation(null);
    }
  };

  const handleConvertToWord = async () => {
    if (!selectedFile) return;
    
    const outputPath = selectedFile.replace('.pdf', '.docx');
    setLoading(true);
    setActiveOperation('convert');
    
    try {
      const result = await tauriAPI.pdfToWord(selectedFile, outputPath);
      onOperationComplete({ type: 'convert', result });
    } catch (error) {
      alert('Conversion failed: ' + error);
    } finally {
      setLoading(false);
      setActiveOperation(null);
    }
  };

  const handleConvertToImages = async () => {
    if (!selectedFile) return;
    
    const outputDir = await tauriAPI.selectOutputFolder();
    if (!outputDir) return;
    
    setLoading(true);
    setActiveOperation('images');
    
    try {
      const result = await tauriAPI.pdfToImages(selectedFile, outputDir, 'png', 200);
      onOperationComplete({ type: 'images', result });
    } catch (error) {
      alert('Conversion failed: ' + error);
    } finally {
      setLoading(false);
      setActiveOperation(null);
    }
  };

  const handleMerge = async () => {
    const files = await tauriAPI.selectPDFFiles();
    if (!files || files.length < 2) {
      alert('Please select at least 2 PDF files to merge');
      return;
    }
    
    const outputPath = files[0].replace('.pdf', '_merged.pdf');
    setLoading(true);
    setActiveOperation('merge');
    
    try {
      const result = await tauriAPI.mergePDFs(files, outputPath);
      onOperationComplete({ type: 'merge', result });
    } catch (error) {
      alert('Merge failed: ' + error);
    } finally {
      setLoading(false);
      setActiveOperation(null);
    }
  };

  const handleSplit = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    
    try {
      // Get PDF info to know page count
      const info = await tauriAPI.getPDFInfo(selectedFile);
      setPdfPageCount(info.pages);
      setShowSplitModal(true);
    } catch (error) {
      alert('Failed to get PDF info: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleSplitSubmit = async (selectedPages: number[]) => {
    if (!selectedFile) return;
    
    const outputDir = await tauriAPI.selectOutputFolder();
    if (!outputDir) {
      setShowSplitModal(false);
      return;
    }
    
    setLoading(true);
    setActiveOperation('split');
    setShowSplitModal(false);
    
    try {
      const result = await tauriAPI.splitPDF(selectedFile, outputDir, selectedPages);
      onOperationComplete({ type: 'split', result });
    } catch (error) {
      alert('Split failed: ' + error);
    } finally {
      setLoading(false);
      setActiveOperation(null);
    }
  };

  const handleRotate = async () => {
    if (!selectedFile) return;
    setShowRotateModal(true);
  };

  const handleRotateSubmit = async (degrees: number) => {
    if (!selectedFile) return;
    
    const outputPath = selectedFile.replace('.pdf', '_rotated.pdf');
    
    setLoading(true);
    setActiveOperation('rotate');
    setShowRotateModal(false);
    
    try {
      const info = await tauriAPI.getPDFInfo(selectedFile);
      const rotations: Record<number, number> = {};
      
      for (let i = 1; i <= info.pages; i++) {
        rotations[i] = degrees;
      }
      
      const result = await tauriAPI.rotatePages(selectedFile, outputPath, rotations);
      onOperationComplete({ type: 'rotate', result });
    } catch (error) {
      alert('Rotation failed: ' + error);
    } finally {
      setLoading(false);
      setActiveOperation(null);
    }
  };

  const handleEncrypt = async () => {
    if (!selectedFile) return;
    setPasswordAction('encrypt');
    setShowPasswordModal(true);
  };

  const handleDecrypt = async () => {
    if (!selectedFile) return;
    setPasswordAction('decrypt');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!selectedFile || !passwordAction) return;
    
    setShowPasswordModal(false);
    setLoading(true);
    setActiveOperation(passwordAction);
    
    try {
      const outputPath = selectedFile.replace('.pdf', `_${passwordAction}ed.pdf`);
      
      if (passwordAction === 'encrypt') {
        const result = await tauriAPI.encryptPDF(selectedFile, outputPath, password);
        onOperationComplete({ type: 'encrypt', result });
      } else {
        const result = await tauriAPI.decryptPDF(selectedFile, outputPath, password);
        onOperationComplete({ type: 'decrypt', result });
      }
    } catch (error) {
      alert(`${passwordAction === 'encrypt' ? 'Encryption' : 'Decryption'} failed: ${error}`);
    } finally {
      setLoading(false);
      setActiveOperation(null);
      setPasswordAction(null);
    }
  };

  const isOperationActive = (op: string) => activeOperation === op;

  return (
    <div className="pdf-toolbar">
      
      <div className="toolbar-section">
        <h3>OCR & Extract</h3>
        <button 
          onClick={handleOCR}
          disabled={!selectedFile || loading}
          className={isOperationActive('ocr') ? 'active' : ''}
        >
          <FileText size={20} />
          Extract Text (OCR)
        </button>
      </div>

      <div className="toolbar-section">
        <h3>Convert</h3>
        <button 
          onClick={handleConvertToWord}
          disabled={!selectedFile || loading}
          className={isOperationActive('convert') ? 'active' : ''}
        >
          <FileType size={20} />
          To Word
        </button>
        <button 
          onClick={handleConvertToImages}
          disabled={!selectedFile || loading}
          className={isOperationActive('images') ? 'active' : ''}
        >
          <FileImage size={20} />
          To Images
        </button>
      </div>

      <div className="toolbar-section">
        <h3>Edit</h3>
        <button 
          onClick={handleMerge}
          disabled={loading}
          className={isOperationActive('merge') ? 'active' : ''}
        >
          <Merge size={20} />
          Merge PDFs
        </button>
        <button 
          onClick={handleSplit}
          disabled={!selectedFile || loading}
          className={isOperationActive('split') ? 'active' : ''}
        >
          <Scissors size={20} />
          Split PDF
        </button>
        <button 
          onClick={handleRotate}
          disabled={!selectedFile || loading}
          className={isOperationActive('rotate') ? 'active' : ''}
        >
          <RotateCw size={20} />
          Rotate Pages
        </button>
        <button 
          onClick={handleCompress}
          disabled={!selectedFile || loading}
          className={isOperationActive('compress') ? 'active' : ''}
        >
          <Droplets size={20} />
          Compress
        </button>
      </div>

      <div className="toolbar-section">
        <h3>Security</h3>
        <button 
          onClick={handleEncrypt}
          disabled={!selectedFile || loading}
          className={isOperationActive('encrypt') ? 'active' : ''}
        >
          <Lock size={20} />
          Encrypt
        </button>
        <button 
          onClick={handleDecrypt}
          disabled={!selectedFile || loading}
          className={isOperationActive('decrypt') ? 'active' : ''}
        >
          <Unlock size={20} />
          Decrypt
        </button>
      </div>

      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Processing...</p>
        </div>
      )}

      {showSplitModal && (
        <SplitModal
          isOpen={showSplitModal}
          totalPages={pdfPageCount}
          onClose={() => setShowSplitModal(false)}
          onSubmit={handleSplitSubmit}
        />
      )}

      {showRotateModal && (
        <RotateModal
          isOpen={showRotateModal}
          onClose={() => setShowRotateModal(false)}
          onSubmit={handleRotateSubmit}
        />
      )}

      {showPasswordModal && passwordAction && (
        <PasswordModal
          isOpen={showPasswordModal}
          title={passwordAction === 'encrypt' ? 'Encrypt PDF' : 'Decrypt PDF'}
          description={
            passwordAction === 'encrypt' 
              ? 'Enter a password to protect your PDF file.' 
              : 'Enter the password to decrypt this PDF file.'
          }
          submitButtonText={passwordAction === 'encrypt' ? 'Encrypt' : 'Decrypt'}
          onClose={() => {
            setShowPasswordModal(false);
            setPasswordAction(null);
          }}
          onSubmit={handlePasswordSubmit}
        />
      )}
    </div>
  );
}
