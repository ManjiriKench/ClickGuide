import React from 'react';
import { ShieldCheck, Check, AlertTriangle } from 'lucide-react';
import { VerificationRecord } from '../types/index.js';

interface VerificationPanelProps {
  records: VerificationRecord[];
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({ records }) => {
  return (
    <div className="card verification-card">
      <div className="card-title-bar">
        <span className="card-title">
          <ShieldCheck size={15} /> Proof-Carrying State Verification
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Actual State as Source of Truth
        </span>
      </div>

      {records.length === 0 ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
          No postconditions checked yet. Executed actions will display verified state diffs here.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="verification-table">
            <thead>
              <tr>
                <th>Operation</th>
                <th>Target</th>
                <th>Expected</th>
                <th>Observed</th>
                <th>Status</th>
                <th>Reversible</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {rec.actionDescription}
                  </td>
                  <td>
                    <code>{rec.targetSelector}</code>
                  </td>
                  <td>{rec.expectedState}</td>
                  <td style={{ fontWeight: 600 }}>{rec.observedState}</td>
                  <td>
                    <span className={`verification-badge ${rec.verified ? 'verified' : 'unverified'}`}>
                      {rec.verified ? (
                        <>
                          <Check size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                          Verified
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                          Mismatch
                        </>
                      )}
                    </span>
                  </td>
                  <td>
                    {rec.canRewind ? (
                      <span style={{ color: 'var(--success)', fontSize: '11px' }}>Yes</span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
