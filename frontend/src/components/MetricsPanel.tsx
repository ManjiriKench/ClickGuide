import React from 'react';
import { Activity, Cpu, CheckCheck, Timer } from 'lucide-react';
import { ModelMetrics } from '../types/index.js';

interface MetricsPanelProps {
  metrics: ModelMetrics;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  return (
    <div className="card">
      <div className="card-title-bar">
        <span className="card-title">
          <Activity size={15} /> Execution & Inference Metrics
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          Gemma 4 FastGuard telemetry
        </span>
      </div>

      <div className="metrics-grid">
        <div className="metric-box">
          <span className="metric-label">
            <CheckCheck size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Verified Rate
          </span>
          <span className="metric-value" style={{ color: '#10b981' }}>
            {metrics.verificationSuccessRate}%
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">
            <Timer size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Gemma Latency
          </span>
          <span className="metric-value" style={{ color: '#818cf8' }}>
            {metrics.inferenceLatencyMs > 0 ? `${metrics.inferenceLatencyMs}ms` : '0ms'}
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">
            <Cpu size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Actions Run
          </span>
          <span className="metric-value">
            {metrics.totalActionsExecuted}
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">
            <Activity size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Gemma Tokens
          </span>
          <span className="metric-value">
            {metrics.totalTokens}
          </span>
        </div>
      </div>
    </div>
  );
};
