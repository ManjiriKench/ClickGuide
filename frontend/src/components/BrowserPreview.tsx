import React from 'react';
import { Eye, RefreshCw, Monitor } from 'lucide-react';

interface BrowserPreviewProps {
  screenshot: string | null;
  onRefreshScreenshot: () => void;
  isLoading: boolean;
  browserActive: boolean;
}

export const BrowserPreview: React.FC<BrowserPreviewProps> = ({
  screenshot,
  onRefreshScreenshot,
  isLoading,
  browserActive
}) => {
  return (
    <div className="card preview-card">
      <div className="card-title-bar">
        <span className="card-title">
          <Monitor size={15} /> Controlled Browser Viewport
        </span>
        {browserActive && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRefreshScreenshot}
            disabled={isLoading}
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            <RefreshCw size={12} className={isLoading ? 'status-dot busy' : ''} />
            Capture
          </button>
        )}
      </div>

      <div className="preview-viewport">
        {screenshot ? (
          <>
            <img
              src={`data:image/jpeg;base64,${screenshot}`}
              alt="Browser Viewport"
              className="preview-image"
            />
            <div className="preview-overlay-info">
              1280x800 • Chromium Isolated Profile
            </div>
          </>
        ) : (
          <div className="preview-placeholder">
            <Eye size={32} />
            <span>{browserActive ? 'Click "Capture" to retrieve live viewport' : 'Launch Chromium to begin preview stream'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
