import React from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { ActionResult } from '../types/index.js';

interface TimelineProps {
  history: ActionResult[];
}

export const Timeline: React.FC<TimelineProps> = ({ history }) => {
  return (
    <div className="card">
      <div className="card-title-bar">
        <span className="card-title">
          <Clock size={15} /> Action Execution Timeline
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          {history.length} action{history.length === 1 ? '' : 's'} recorded
        </span>
      </div>

      {history.length === 0 ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
          No actions executed yet. Propose or start a task to see the execution receipt stream.
        </div>
      ) : (
        <div className="timeline-list">
          {history.map((item, index) => (
            <div
              key={index}
              className={`timeline-item ${item.success ? 'success' : 'failure'}`}
            >
              <div style={{ paddingTop: '2px' }}>
                {item.success ? (
                  <CheckCircle2 size={16} color="#10b981" />
                ) : (
                  <XCircle size={16} color="#ef4444" />
                )}
              </div>
              <div className="timeline-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="timeline-title">
                    {item.action.description || `${item.action.type.toUpperCase()} ${item.action.selector}`}
                  </span>
                  <span className="timeline-time">{item.durationMs}ms</span>
                </div>
                <div className="timeline-detail">
                  Target: <code>{item.action.selector}</code>
                  {item.action.value && ` • Value: "${item.action.value}"`}
                </div>
                {item.error && (
                  <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                    {item.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
