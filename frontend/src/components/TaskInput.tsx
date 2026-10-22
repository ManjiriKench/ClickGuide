import React from 'react';
import { Terminal } from 'lucide-react';

interface TaskInputProps {
  task: string;
  onTaskChange: (task: string) => void;
  disabled?: boolean;
}

const PRESET_TASKS = [
  'Disable promotional notifications and change default report format to CSV.',
  'Switch workspace theme to Dark and save changes.',
  'Turn off email notifications and keep promotional notifications on.',
  'Reset settings to defaults and verify light theme.'
];

export const TaskInput: React.FC<TaskInputProps> = ({ task, onTaskChange, disabled }) => {
  return (
    <div className="task-input-container">
      <div className="card-title-bar">
        <span className="card-title">
          <Terminal size={15} /> Natural-Language Objective
        </span>
      </div>

      <textarea
        className="task-textarea"
        placeholder="Describe the desired outcome (e.g., 'Disable promotional notifications and change report format to CSV')..."
        value={task}
        onChange={(e) => onTaskChange(e.target.value)}
        disabled={disabled}
      />

      <div className="task-suggestions">
        {PRESET_TASKS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            className="suggestion-chip"
            onClick={() => onTaskChange(preset)}
            disabled={disabled}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
};
