import { useState } from 'react';
import { Lock, Eye, EyeOff, X, Shield, AlertCircle } from 'lucide-react';
import './PasswordModal.css';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  title: string;
  description: string;
  submitButtonText?: string;
}

export default function PasswordModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  submitButtonText = 'Submit'
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const isEncrypting = title.toLowerCase().includes('encrypt');

  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: '' };
    
    let score = 0;
    
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;
    
    if (score <= 2) return { score: 1, label: 'Weak', color: '#ef4444' };
    if (score <= 4) return { score: 2, label: 'Medium', color: '#f59e0b' };
    return { score: 3, label: 'Strong', color: '#10b981' };
  };

  const strength = getPasswordStrength(password);
  const passwordsMatch = !isEncrypting || password === confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) return;
    
    if (isEncrypting && password !== confirmPassword) {
      return;
    }
    
    onSubmit(password);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirm(false);
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirm(false);
    onClose();
  };

  return (
    <div className="password-modal-overlay" onClick={handleClose}>
      <div className="password-modal" onClick={(e) => e.stopPropagation()}>
        <button className="password-modal-close" onClick={handleClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="password-modal-header">
          <div className={`password-modal-icon ${isEncrypting ? 'encrypt' : 'decrypt'}`}>
            {isEncrypting ? <Shield size={24} /> : <Lock size={24} />}
          </div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="password-modal-form">
          <div className="input-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                className="password-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {isEncrypting && password && (
              <div className="password-strength">
                <div className="strength-bars">
                  <div className={`strength-bar ${strength.score >= 1 ? 'active' : ''}`} />
                  <div className={`strength-bar ${strength.score >= 2 ? 'active' : ''}`} />
                  <div className={`strength-bar ${strength.score >= 3 ? 'active' : ''}`} />
                </div>
                <span className={`strength-label ${strength.label.toLowerCase()}`}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          {isEncrypting && (
            <div className="input-group">
              <label>Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="password-input"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {confirmPassword && !passwordsMatch && (
                <div className="password-error">
                  <AlertCircle size={14} />
                  <span>Passwords do not match</span>
                </div>
              )}
            </div>
          )}

          <div className="password-modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password.trim() || (isEncrypting && !passwordsMatch)}
              className="btn-submit"
            >
              {submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
