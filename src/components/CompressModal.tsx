import { useState } from 'react';
import { X, Droplets, FileText } from 'lucide-react';
import './CompressModal.css';

interface CompressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (quality: number) => void;
  originalSize?: number;
}

export default function CompressModal({ isOpen, onClose, onSubmit, originalSize = 0 }: CompressModalProps) {
  const [quality, setQuality] = useState(75);

  if (!isOpen) return null;

  const handleClose = () => {
    setQuality(75);
    onClose();
  };

  const handleSubmit = () => {
    onSubmit(quality);
    handleClose();
  };

  const getQualityLabel = (q: number): string => {
    if (q <= 30) return 'Maximum Compression';
    if (q <= 50) return 'High Compression';
    if (q <= 70) return 'Medium Compression';
    if (q <= 85) return 'Light Compression';
    return 'Minimal Compression';
  };

  const estimateCompression = (q: number): number => {
    // Estimate compression percentage based on quality
    if (q <= 30) return 80; // ~80% reduction
    if (q <= 50) return 60; // ~60% reduction
    if (q <= 70) return 40; // ~40% reduction
    if (q <= 85) return 25; // ~25% reduction
    return 10; // ~10% reduction
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const estimatedSize = originalSize * (1 - estimateCompression(quality) / 100);
  const compressionPercent = estimateCompression(quality);

  return (
    <div className="compress-modal-overlay" onClick={handleClose}>
      <div className="compress-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <Droplets size={24} />
            <h2>Compress PDF</h2>
          </div>
          <button className="close-btn" onClick={handleClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="compress-info">
            <p className="info-text">Adjust compression quality</p>
          </div>

          {originalSize > 0 && (
            <div className="size-preview">
              <div className="size-item">
                <FileText size={16} />
                <div>
                  <span className="size-label">Original Size</span>
                  <span className="size-value">{formatFileSize(originalSize)}</span>
                </div>
              </div>
              <div className="size-arrow">→</div>
              <div className="size-item estimated">
                <Droplets size={16} />
                <div>
                  <span className="size-label">Estimated Size</span>
                  <span className="size-value">{formatFileSize(estimatedSize)}</span>
                </div>
              </div>
            </div>
          )}

          <div 
            className={`quality-display quality-${quality <= 30 ? 'max' : quality <= 50 ? 'high' : quality <= 70 ? 'medium' : quality <= 85 ? 'light' : 'minimal'}`}
          >
            <span className="quality-value">
              {quality}%
            </span>
            <span className="quality-label">{getQualityLabel(quality)}</span>
            <span className="compression-estimate">
              ~{compressionPercent}% size reduction
            </span>
          </div>

          <div className="slider-container">
            <label htmlFor="quality-slider">Quality Level</label>
            <input
              id="quality-slider"
              type="range"
              min="10"
              max="100"
              step="5"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className="quality-slider"
              aria-label="Compression quality"
            />
            <div className="slider-labels">
              <span>10%</span>
              <span>Maximum Compression</span>
              <span>100%</span>
            </div>
          </div>

          <div className="quality-presets">
            <span className="presets-label">Quick Presets:</span>
            <div className="preset-buttons">
              <button
                type="button"
                className={`preset-btn ${quality === 25 ? 'active' : ''}`}
                onClick={() => setQuality(25)}
              >
                Maximum
              </button>
              <button
                type="button"
                className={`preset-btn ${quality === 50 ? 'active' : ''}`}
                onClick={() => setQuality(50)}
              >
                High
              </button>
              <button
                type="button"
                className={`preset-btn ${quality === 75 ? 'active' : ''}`}
                onClick={() => setQuality(75)}
              >
                Medium
              </button>
              <button
                type="button"
                className={`preset-btn ${quality === 90 ? 'active' : ''}`}
                onClick={() => setQuality(90)}
              >
                Light
              </button>
            </div>
          </div>

          <div className="compression-note">
            <p>💡 <strong>Tip:</strong> Lower quality = smaller file size but reduced image quality. 
            For documents with mostly text, high compression works well.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={handleClose} className="btn-cancel">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="btn-submit">
            <Droplets size={18} />
            Compress PDF
          </button>
        </div>
      </div>
    </div>
  );
}
