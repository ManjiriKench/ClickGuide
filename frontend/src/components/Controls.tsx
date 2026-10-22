import React from 'react';
import { Play, Square, RotateCcw, Undo2, Zap } from 'lucide-react';
import { ExecutionMode, AgentStatus } from '../types/index.js';

interface ControlsProps {
  mode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
  deadlineMode: boolean;
  onDeadlineToggle: (enabled: boolean) => void;
  agentStatus: AgentStatus;
  browserActive: boolean;
  canRewind: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onRewind: () => void;
  onLaunchBrowser: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  mode,
  onModeChange,
  deadlineMode,
  onDeadlineToggle,
  agentStatus,
  browserActive,
  canRewind,
  onStart,
  onStop,
  onReset,
  onRewind,
  onLaunchBrowser
}) => {
  const isRunning = ['inspecting', 'planning', 'executing', 'verifying'].includes(agentStatus);

  return (
    <div>
      <div className="controls-bar">
        <div className="mode-selector">
          <button
            type="button"
            className={`mode-btn ${mode === 'guided' ? 'active' : ''}`}
            onClick={() => onModeChange('guided')}
          >
            Guided Mode
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'auto' ? 'active' : ''}`}
            onClick={() => onModeChange('auto')}
          >
            Auto Mode
          </button>
        </div>

        <div className="toggle-switch-wrapper">
          <Zap size={15} color={deadlineMode ? '#f59e0b' : '#64748b'} />
          <span>Deadline Mode</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={deadlineMode}
              onChange={(e) => onDeadlineToggle(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="button-row">
        {!browserActive ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onLaunchBrowser}
          >
            <Play size={14} /> Launch Browser
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-primary"
              disabled={isRunning}
              onClick={onStart}
            >
              <Play size={14} /> Start Task
            </button>

            <button
              type="button"
              className="btn btn-danger"
              disabled={!isRunning}
              onClick={onStop}
            >
              <Square size={14} /> Stop
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onReset}
            >
              <RotateCcw size={14} /> Reset
            </button>

            <button
              type="button"
              className="btn btn-accent"
              disabled={!canRewind || isRunning}
              onClick={onRewind}
              title="Rollback supported reversible settings"
            >
              <Undo2 size={14} /> Rewind
            </button>
          </>
        )}
      </div>
    </div>
  );
};
