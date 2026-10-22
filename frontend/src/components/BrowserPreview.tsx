import React, { useState, useEffect } from 'react';
import { Eye, RefreshCw, Monitor, Globe, ArrowRight } from 'lucide-react';

interface BrowserPreviewProps {
  screenshot: string | null;
  onRefreshScreenshot: () => void;
  isLoading: boolean;
  browserActive: boolean;
  currentUrl?: string;
  onNavigate?: (url: string) => void;
}

export const BrowserPreview: React.FC<BrowserPreviewProps> = ({
  screenshot,
  onRefreshScreenshot,
  isLoading,
  browserActive,
  currentUrl = 'http://127.0.0.1:5000/demo/index.html',
  onNavigate
}) => {
  const [inputUrl, setInputUrl] = useState(currentUrl);

  useEffect(() => {
    if (currentUrl) {
      setInputUrl(currentUrl);
    }
  }, [currentUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onNavigate && inputUrl.trim()) {
      onNavigate(inputUrl.trim());
    }
  };

  const handleQuickNav = (url: string) => {
    setInputUrl(url);
    if (onNavigate) {
      onNavigate(url);
    }
  };

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

      {browserActive && (
        <div style={{ marginBottom: '10px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <Globe size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Enter any website URL (e.g. https://en.wikipedia.org)"
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-secondary"
              style={{ padding: '7px 12px', fontSize: '12px' }}
              disabled={isLoading}
            >
              <ArrowRight size={13} /> Go
            </button>
          </form>

          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Quick test:</span>
            <button
              type="button"
              onClick={() => handleQuickNav('http://127.0.0.1:5000/demo/index.html')}
              style={{ padding: '2px 8px', fontSize: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Admin Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickNav('https://en.wikipedia.org')}
              style={{ padding: '2px 8px', fontSize: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Wikipedia
            </button>
            <button
              type="button"
              onClick={() => handleQuickNav('https://news.ycombinator.com')}
              style={{ padding: '2px 8px', fontSize: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Hacker News
            </button>
            <button
              type="button"
              onClick={() => handleQuickNav('https://github.com')}
              style={{ padding: '2px 8px', fontSize: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              GitHub
            </button>
          </div>
        </div>
      )}

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
