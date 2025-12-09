import { useState, useEffect } from 'react';
import { Clock, Trash2, FileText } from 'lucide-react';
import '../styles/FileHistory.css';

interface FileHistoryProps {
  onFileSelect: (path: string) => void;
}

interface HistoryItem {
  path: string;
  name: string;
  timestamp: number;
  size?: number;
}

const FileHistory = ({ onFileSelect }: FileHistoryProps) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('file_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    localStorage.setItem('file_history', JSON.stringify(items));
  };

  const removeFromHistory = (path: string) => {
    const updated = history.filter(h => h.path !== path);
    saveHistory(updated);
  };

  const clearHistory = () => {
    if (confirm('Clear all history?')) {
      saveHistory([]);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="file-history">
      <div className="history-header">
        <h3>
          <Clock size={20} />
          Recent Files
        </h3>
        {history.length > 0 && (
          <button onClick={clearHistory} className="clear-btn">
            <Trash2 size={16} />
            Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <p>No recent files</p>
          <span>Upload a PDF to get started</span>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item, idx) => (
            <div key={idx} className="history-item">
              <div className="item-info" onClick={() => onFileSelect(item.path)}>
                <FileText size={20} />
                <div className="item-details">
                  <span className="item-name">{item.name}</span>
                  <span className="item-time">{formatDate(item.timestamp)}</span>
                </div>
              </div>
              <button
              title='Remove from history'
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromHistory(item.path);
                }}
                className="remove-btn"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileHistory;
export type { HistoryItem };
