import { useState } from 'react';
import { X, RotateCw, RotateCcw } from 'lucide-react';
import '../styles/ui/RotateModal.css';

interface RotateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (degrees: number) => void;
}

export default function RotateModal({ isOpen, onClose, onSubmit }: RotateModalProps) {
  const [rotation, setRotation] = useState(90);

  if (!isOpen) return null;

  const handleClose = () => {
    setRotation(90);
    onClose();
  };

  const handleSubmit = () => {
    onSubmit(rotation);
    handleClose();
  };

  const rotationOptions = [
    { degrees: 90, label: '90° CW', icon: RotateCw },
    { degrees: 180, label: '180°', icon: RotateCw },
    { degrees: 270, label: '90° CCW', icon: RotateCcw },
  ];

  return (
    <div className="rotate-modal-overlay" onClick={handleClose}>
      <div className="rotate-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <RotateCw size={24} />
            <h2>Rotate PDF Pages</h2>
          </div>
          <button className="close-btn" onClick={handleClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="rotation-info">
            <p className="info-text">Select rotation angle for all pages</p>
          </div>

          <div className="rotation-preview">
            <div className="preview-box">
              <div 
                className={`preview-page rotate-${rotation}`}
              >
                <div className="page-content">
                  <div className="page-line"></div>
                  <div className="page-line"></div>
                  <div className="page-line"></div>
                </div>
              </div>
            </div>
            <p className="preview-label">{rotation}° Rotation</p>
          </div>

          <div className="rotation-options">
            {rotationOptions.map(({ degrees, label, icon: Icon }) => (
              <button
                key={degrees}
                type="button"
                className={`rotation-btn ${rotation === degrees ? 'selected' : ''}`}
                onClick={() => setRotation(degrees)}
              >
                <Icon size={28} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="custom-rotation">
            <label htmlFor="angle-input">Custom Angle</label>
            <div className="angle-input-group">
              <input
                id="angle-input"
                type="number"
                value={rotation}
                onChange={(e) => {
                  let value = parseInt(e.target.value) || 0;
                  value = value % 360;
                  if (value < 0) value += 360;
                  setRotation(value);
                }}
                min="0"
                max="359"
                step="1"
                className="angle-input"
                aria-label="Custom rotation angle"
              />
              <span className="input-suffix">degrees</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={handleClose} className="btn-cancel">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="btn-submit">
            <RotateCw size={18} />
            Apply Rotation
          </button>
        </div>
      </div>
    </div>
  );
}
