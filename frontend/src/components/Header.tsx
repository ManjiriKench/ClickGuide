import React from 'react';
import { Compass, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { AgentStatus } from '../types/index.js';

interface HeaderProps {
  browserActive: boolean;
  agentStatus: AgentStatus;
  modelName?: string;
  hasApiKey?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ browserActive, agentStatus, modelName = 'gemma-4-26b-a4b-it', hasApiKey }) => {
  const getStatusLabel = () => {
    switch (agentStatus) {
      case 'idle':
        return 'System Ready';
      case 'inspecting':
        return 'Inspecting DOM...';
      case 'planning':
        return 'Gemma 4 Planning...';
      case 'executing':
        return 'Executing Action...';
      case 'verifying':
        return 'Verifying Postcondition...';
      case 'completed':
        return 'Task Completed';
      case 'stopped':
        return 'Halted by User';
      case 'error':
        return 'Action Failed';
      default:
        return agentStatus;
    }
  };

  const isBusy = ['inspecting', 'planning', 'executing', 'verifying'].includes(agentStatus);

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <Compass size={20} />
        </div>
        <div>
          <span className="brand-name">ClickGuide</span>
          <span className="brand-tagline">Verified Browser Automation</span>
        </div>
      </div>

      <div className="header-right">
        <div className="status-chip" title="Gemma 4 Primary Reasoning Model">
          <span className="status-dot active" style={{ backgroundColor: '#a855f7' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{modelName}</span>
        </div>

        <div className="status-chip">
          <span className={`status-dot ${hasApiKey ? 'active' : ''}`} style={{ backgroundColor: hasApiKey ? '#10b981' : '#f59e0b' }} />
          <span>{hasApiKey ? 'API Key Active' : 'API Key Pending'}</span>
        </div>

        <div className="status-chip">
          <span className={`status-dot ${browserActive ? 'active' : ''}`} />
          <span>{browserActive ? 'Chromium Connected' : 'Browser Offline'}</span>
        </div>

        <div className="status-chip">
          {isBusy ? (
            <RefreshCw size={14} className="status-dot busy" style={{ animation: 'spin 1s linear infinite' }} />
          ) : agentStatus === 'error' ? (
            <AlertCircle size={14} color="#ef4444" />
          ) : (
            <CheckCircle2 size={14} color="#10b981" />
          )}
          <span>{getStatusLabel()}</span>
        </div>
      </div>
    </header>
  );
};
