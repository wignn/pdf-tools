import { useState } from 'react';
import { FileText, FileImage, Scissors, Merge as MergeIcon, RotateCw, Droplets, Lock, Unlock } from 'lucide-react';
import { pdfOperations } from '../utils/pdfOperations';
import './ToolsPanel.css';

interface ToolsPanelProps {
  currentFile: string | null;
  onOperationComplete: (result: any) => void;
}

export default function ToolsPanel({ currentFile, onOperationComplete }: ToolsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [activeOp, setActiveOp] = useState<string | null>(null);

  const handleOperation = async (operation: string, handler: () => Promise<any>) => {
    setLoading(true);
    setActiveOp(operation);
    try {
      const result = await handler();
      onOperationComplete({ type: operation, result, success: true });
    } catch (error) {
      onOperationComplete({ type: operation, error: String(error), success: false });
    } finally {
      setLoading(false);
      setActiveOp(null);
    }
  };

  const handleExtractText = async () => {
    if (!currentFile) return;
    await handleOperation('extract', () => pdfOperations.extractText(currentFile));
  };

  const handleConvertToWord = async () => {
    if (!currentFile) return;
    const outputPath = await pdfOperations.selectOutputPath(currentFile.replace('.pdf', '.docx'));
    if (!outputPath) return;
    await handleOperation('toWord', () => pdfOperations.convertToWord(currentFile, outputPath));
  };

  const handleConvertToImages = async () => {
    if (!currentFile) return;
    const outputDir = await pdfOperations.selectFolder();
    if (!outputDir) return;
    await handleOperation('toImages', () => pdfOperations.convertToImages(currentFile, outputDir));
  };

  const handleMergePDFs = async () => {
    const files = await pdfOperations.selectMultiplePDFs();
    if (!files || files.length < 2) return;
    const outputPath = await pdfOperations.selectOutputPath('merged.pdf');
    if (!outputPath) return;
    await handleOperation('merge', () => pdfOperations.mergePDFs(files, outputPath));
  };

  const handleSplitPDF = async () => {
    if (!currentFile) return;
    const outputDir = await pdfOperations.selectFolder();
    if (!outputDir) return;
    // For now, split all pages
    const info = await pdfOperations.getPDFInfo(currentFile);
    const pages = Array.from({ length: info.page_count }, (_, i) => i + 1);
    await handleOperation('split', () => pdfOperations.splitPDF(currentFile, outputDir, pages));
  };

  const handleRotatePages = async () => {
    if (!currentFile) return;
    const outputPath = await pdfOperations.selectOutputPath(currentFile.replace('.pdf', '_rotated.pdf'));
    if (!outputPath) return;
    // Rotate all pages 90 degrees clockwise
    const info = await pdfOperations.getPDFInfo(currentFile);
    const rotations: Record<number, number> = {};
    for (let i = 1; i <= info.page_count; i++) {
      rotations[i] = 90;
    }
    await handleOperation('rotate', () => pdfOperations.rotatePages(currentFile, outputPath, rotations));
  };

  const handleCompress = async () => {
    if (!currentFile) return;
    const outputPath = await pdfOperations.selectOutputPath(currentFile.replace('.pdf', '_compressed.pdf'));
    if (!outputPath) return;
    await handleOperation('compress', () => pdfOperations.compress(currentFile, outputPath, 'medium'));
  };

  const handleEncrypt = async () => {
    if (!currentFile) return;
    const password = prompt('Enter password for encryption:');
    if (!password) return;
    const outputPath = await pdfOperations.selectOutputPath(currentFile.replace('.pdf', '_encrypted.pdf'));
    if (!outputPath) return;
    await handleOperation('encrypt', () => pdfOperations.encrypt(currentFile, outputPath, password));
  };

  const handleDecrypt = async () => {
    if (!currentFile) return;
    const password = prompt('Enter password to decrypt:');
    if (!password) return;
    const outputPath = await pdfOperations.selectOutputPath(currentFile.replace('.pdf', '_decrypted.pdf'));
    if (!outputPath) return;
    await handleOperation('decrypt', () => pdfOperations.decrypt(currentFile, outputPath, password));
  };

  const isDisabled = !currentFile || loading;

  return (
    <div className="tools-panel">
      <section className="tools-section">
        <h3>OCR & EXTRACT</h3>
        <button
          className="tool-button"
          onClick={handleExtractText}
          disabled={isDisabled}
        >
          <FileText size={20} />
          <span>Extract Text (OCR)</span>
          {activeOp === 'extract' && <div className="spinner" />}
        </button>
      </section>

      <section className="tools-section">
        <h3>CONVERT</h3>
        <button
          className="tool-button"
          onClick={handleConvertToWord}
          disabled={isDisabled}
        >
          <FileText size={20} />
          <span>To Word</span>
          {activeOp === 'toWord' && <div className="spinner" />}
        </button>
        <button
          className="tool-button"
          onClick={handleConvertToImages}
          disabled={isDisabled}
        >
          <FileImage size={20} />
          <span>To Images</span>
          {activeOp === 'toImages' && <div className="spinner" />}
        </button>
      </section>

      <section className="tools-section">
        <h3>EDIT</h3>
        <button
          className="tool-button"
          onClick={handleMergePDFs}
          disabled={loading}
        >
          <MergeIcon size={20} />
          <span>Merge PDFs</span>
          {activeOp === 'merge' && <div className="spinner" />}
        </button>
        <button
          className="tool-button"
          onClick={handleSplitPDF}
          disabled={isDisabled}
        >
          <Scissors size={20} />
          <span>Split PDF</span>
          {activeOp === 'split' && <div className="spinner" />}
        </button>
        <button
          className="tool-button"
          onClick={handleRotatePages}
          disabled={isDisabled}
        >
          <RotateCw size={20} />
          <span>Rotate Pages</span>
          {activeOp === 'rotate' && <div className="spinner" />}
        </button>
        <button
          className="tool-button"
          onClick={handleCompress}
          disabled={isDisabled}
        >
          <Droplets size={20} />
          <span>Compress</span>
          {activeOp === 'compress' && <div className="spinner" />}
        </button>
      </section>

      <section className="tools-section">
        <h3>SECURITY</h3>
        <button
          className="tool-button"
          onClick={handleEncrypt}
          disabled={isDisabled}
        >
          <Lock size={20} />
          <span>Encrypt</span>
          {activeOp === 'encrypt' && <div className="spinner" />}
        </button>
        <button
          className="tool-button"
          onClick={handleDecrypt}
          disabled={isDisabled}
        >
          <Unlock size={20} />
          <span>Decrypt</span>
          {activeOp === 'decrypt' && <div className="spinner" />}
        </button>
      </section>
    </div>
  );
}
