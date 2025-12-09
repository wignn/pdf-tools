import { useState } from 'react';
import { X, Check, Scissors } from 'lucide-react';
import './SplitModal.css';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pages: number[]) => void;
  totalPages: number;
}

export default function SplitModal({ isOpen, onClose, onSubmit, totalPages }: SplitModalProps) {
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  if (!isOpen) return null;

  const togglePage = (page: number) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(page)) {
      newSelected.delete(page);
    } else {
      newSelected.add(page);
    }
    setSelectedPages(newSelected);
  };

  const selectRange = () => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    
    if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
      alert('Invalid range');
      return;
    }

    const newSelected = new Set(selectedPages);
    for (let i = start; i <= end; i++) {
      newSelected.add(i);
    }
    setSelectedPages(newSelected);
  };

  const selectAll = () => {
    const all = new Set<number>();
    for (let i = 1; i <= totalPages; i++) {
      all.add(i);
    }
    setSelectedPages(all);
  };

  const clearAll = () => {
    setSelectedPages(new Set());
  };

  const handleSubmit = () => {
    if (selectedPages.size === 0) {
      alert('Please select at least one page');
      return;
    }
    onSubmit(Array.from(selectedPages).sort((a, b) => a - b));
    handleClose();
  };

  const handleClose = () => {
    setSelectedPages(new Set());
    setRangeStart('');
    setRangeEnd('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="split-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <Scissors size={24} />
            <h2>Split PDF</h2>
          </div>
          <button className="close-btn" onClick={handleClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="selection-info">
            <span className="info-text">
              Select pages to extract ({selectedPages.size} of {totalPages} selected)
            </span>
          </div>

          <div className="range-selector">
            <div className="range-inputs">
              <input
                type="number"
                placeholder="From"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                min="1"
                max={totalPages}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="To"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                min="1"
                max={totalPages}
              />
              <button className="btn-range" onClick={selectRange}>
                Add Range
              </button>
            </div>
            <div className="quick-actions">
              <button className="btn-quick" onClick={selectAll}>
                Select All
              </button>
              <button className="btn-quick" onClick={clearAll}>
                Clear
              </button>
            </div>
          </div>

          <div className="pages-grid">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`page-item ${selectedPages.has(page) ? 'selected' : ''}`}
                onClick={() => togglePage(page)}
              >
                <div className="page-number">{page}</div>
                {selectedPages.has(page) && (
                  <div className="check-icon">
                    <Check size={16} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={handleClose}>
            Cancel
          </button>
          <button 
            className="btn-submit" 
            onClick={handleSubmit}
            disabled={selectedPages.size === 0}
          >
            <Scissors size={18} />
            Split PDF ({selectedPages.size} pages)
          </button>
        </div>
      </div>
    </div>
  );
}
