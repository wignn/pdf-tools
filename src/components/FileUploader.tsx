import { useState, useCallback } from 'react';
import {Upload, FolderOpen } from 'lucide-react';
import { tauriAPI } from '../utils/tauri';
import '../styles/FileUploader.css';

interface FileUploaderProps {
  onFilesSelected: (files: string[]) => void;
}

export default function FileUploader({ onFilesSelected }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleSelectFiles = useCallback(async () => {
    const files = await tauriAPI.selectPDFFiles();
    if (files) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    

    alert('Please use the "Select Files" button to choose PDF files');
  }, []);

  return (
    <div className="file-uploader">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="upload-icon" size={48} />
        <h3>Drop PDF files here</h3>
        <p>or</p>
        <button className="select-btn" onClick={handleSelectFiles}>
          <FolderOpen size={20} />
          Select Files
        </button>
      </div>
    </div>
  );
}
