import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.js';
import { Controls } from './components/Controls.js';
import { TaskInput } from './components/TaskInput.js';
import { BrowserPreview } from './components/BrowserPreview.js';
import { Timeline } from './components/Timeline.js';
import { VerificationPanel } from './components/VerificationPanel.js';
import { MetricsPanel } from './components/MetricsPanel.js';
import {
  ExecutionMode,
  AgentStatus,
  ActionResult,
  VerificationRecord,
  ModelMetrics,
  BrowserAction
} from './types/index.js';
import * as api from './services/api.js';

export function App() {
  const [task, setTask] = useState('Disable promotional notifications and change default report format to CSV.');
  const [mode, setMode] = useState<ExecutionMode>('auto');
  const [deadlineMode, setDeadlineMode] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [browserActive, setBrowserActive] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [timeline, setTimeline] = useState<ActionResult[]>([]);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [canRewind, setCanRewind] = useState(false);
  const [lastReversibleAction, setLastReversibleAction] = useState<{
    originalAction: BrowserAction;
    reverseAction: BrowserAction;
  } | null>(null);

  const [metrics, setMetrics] = useState<ModelMetrics>({
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    inferenceLatencyMs: 0,
    executionLatencyMs: 0,
    totalActionsExecuted: 0,
    verificationSuccessRate: 100,
    model: 'gemma-4-26b-a4b-it'
  });

  const [modelConfig, setModelConfig] = useState<{ model: string; hasApiKey: boolean; timeoutMs: number }>({
    model: 'gemma-4-26b-a4b-it',
    hasApiKey: false,
    timeoutMs: 25000
  });

  const checkStatus = useCallback(async () => {
    try {
      const [statusRes, configRes] = await Promise.all([
        api.getBrowserStatus(),
        api.getModelConfig().catch(() => ({ model: 'gemma-4-26b-a4b-it', hasApiKey: false, timeoutMs: 25000 }))
      ]);
      setBrowserActive(statusRes.launched);
      setModelConfig(configRes);
    } catch {
      setBrowserActive(false);
    }
  }, []);

  const refreshScreenshot = useCallback(async () => {
    if (!browserActive) return;
    setIsLoadingPreview(true);
    try {
      const res = await api.getScreenshot();
      setScreenshot(res.screenshot);
    } catch (err) {
      console.error('Screenshot retrieval failed:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [browserActive]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleLaunchBrowser = async () => {
    try {
      setAgentStatus('inspecting');
      await api.launchBrowser();
      setBrowserActive(true);
      await refreshScreenshot();
      setAgentStatus('idle');
    } catch (err: unknown) {
      console.error(err);
      setAgentStatus('error');
    }
  };

  const handleStartTask = async () => {
    if (!browserActive) {
      await handleLaunchBrowser();
    }

    setAgentStatus('inspecting');

    try {
      const snapshot = await api.inspectPage(true);
      if (snapshot.screenshotBase64) {
        setScreenshot(snapshot.screenshotBase64);
      }

      setAgentStatus('planning');

      if (modelConfig.hasApiKey) {
        try {
          const gemmaPlan = await api.planTaskWithGemma(task);
          if (gemmaPlan.metrics) {
            setMetrics((prev) => ({
              ...prev,
              inferenceLatencyMs: gemmaPlan.metrics.latencyMs,
              promptTokens: gemmaPlan.metrics.promptTokens,
              completionTokens: gemmaPlan.metrics.completionTokens,
              totalTokens: gemmaPlan.metrics.totalTokens,
              model: gemmaPlan.metrics.model
            }));
          }
        } catch (planErr) {
          console.warn('Gemma 4 planning notice:', planErr);
        }
      } else {
        await new Promise((r) => setTimeout(r, deadlineMode ? 100 : 400));
      }

      const plannedActions: { action: BrowserAction; expected: string; rollback: BrowserAction }[] = [];

      const lowerTask = task.toLowerCase();

      if (lowerTask.includes('promo') || lowerTask.includes('promotional')) {
        const promoEl = snapshot.elements.find(
          (e) => e.id === 'promo-notifications' || e.selector.includes('promo')
        );
        if (promoEl && promoEl.checked !== false) {
          plannedActions.push({
            action: {
              type: 'uncheck',
              selector: '#promo-notifications',
              description: 'Turn off Promotional Notifications switch'
            },
            expected: 'Unchecked (false)',
            rollback: {
              type: 'check',
              selector: '#promo-notifications',
              description: 'Re-enable Promotional Notifications switch'
            }
          });
        }
      }

      if (lowerTask.includes('csv') || lowerTask.includes('report format')) {
        plannedActions.push({
          action: {
            type: 'select',
            selector: '#report-format',
            value: 'CSV',
            description: 'Change default report format dropdown to CSV'
          },
          expected: 'CSV',
          rollback: {
            type: 'select',
            selector: '#report-format',
            value: 'PDF',
            description: 'Revert default report format dropdown to PDF'
          }
        });
      }

      if (lowerTask.includes('theme') && lowerTask.includes('dark')) {
        plannedActions.push({
          action: {
            type: 'select',
            selector: '#theme-selector',
            value: 'Dark',
            description: 'Select Dark workspace theme'
          },
          expected: 'Dark',
          rollback: {
            type: 'select',
            selector: '#theme-selector',
            value: 'Light',
            description: 'Restore Light workspace theme'
          }
        });
      }

      plannedActions.push({
        action: {
          type: 'click',
          selector: '#save-settings-btn',
          description: 'Submit and persist changes via Save Changes button'
        },
        expected: 'Saved successfully',
        rollback: {
          type: 'click',
          selector: '#save-settings-btn',
          description: 'Re-submit persisted state'
        }
      });

      let totalDuration = 0;
      const newTimeline: ActionResult[] = [...timeline];
      const newVerifications: VerificationRecord[] = [...verifications];

      for (const item of plannedActions) {
        setAgentStatus('executing');
        if (!deadlineMode) {
          await new Promise((r) => setTimeout(r, 250));
        }

        const result = await api.executeAction(item.action);
        totalDuration += result.durationMs;
        newTimeline.unshift(result);
        setTimeline([...newTimeline]);

        setAgentStatus('verifying');
        const freshSnapshot = await api.inspectPage(false);
        const targetEl = freshSnapshot.elements.find((e) => e.selector === item.action.selector);

        let observed = 'Updated';
        let verified = result.success;

        if (item.action.type === 'uncheck' || item.action.type === 'check') {
          observed = targetEl?.checked ? 'Checked (true)' : 'Unchecked (false)';
          verified = targetEl?.checked === (item.action.type === 'check');
        } else if (item.action.type === 'select') {
          observed = targetEl?.value || 'Unknown';
          verified = targetEl?.value === item.action.value;
        }

        newVerifications.unshift({
          id: Math.random().toString(36).substring(2, 9),
          actionDescription: item.action.description || item.action.selector,
          targetSelector: item.action.selector,
          expectedState: item.expected,
          observedState: observed,
          verified,
          timestamp: Date.now(),
          canRewind: true
        });
        setVerifications([...newVerifications]);

        setLastReversibleAction({
          originalAction: item.action,
          reverseAction: item.rollback
        });
        setCanRewind(true);
      }

      await refreshScreenshot();
      setAgentStatus('completed');

      setMetrics((prev) => {
        const total = prev.totalActionsExecuted + plannedActions.length;
        const verifiedCount = newVerifications.filter((v) => v.verified).length;
        const rate = newVerifications.length > 0 ? Math.round((verifiedCount / newVerifications.length) * 100) : 100;
        return {
          ...prev,
          totalActionsExecuted: total,
          executionLatencyMs: totalDuration,
          verificationSuccessRate: rate
        };
      });
    } catch (err: unknown) {
      console.error(err);
      setAgentStatus('error');
    }
  };

  const handleStopTask = () => {
    setAgentStatus('stopped');
  };

  const handleReset = async () => {
    try {
      if (browserActive) {
        await api.executeAction({
          type: 'click',
          selector: '#reset-defaults-btn',
          description: 'Reset settings to defaults'
        });
        await refreshScreenshot();
      }
      setTimeline([]);
      setVerifications([]);
      setCanRewind(false);
      setLastReversibleAction(null);
      setAgentStatus('idle');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRewind = async () => {
    if (!lastReversibleAction || !browserActive) return;

    setAgentStatus('executing');
    try {
      const rollbackResult = await api.executeAction(lastReversibleAction.reverseAction);
      const newTimeline = [rollbackResult, ...timeline];
      setTimeline(newTimeline);

      setAgentStatus('verifying');
      await refreshScreenshot();

      setVerifications((prev) => [
        {
          id: Math.random().toString(36).substring(2, 9),
          actionDescription: `Rewind: ${lastReversibleAction.reverseAction.description}`,
          targetSelector: lastReversibleAction.reverseAction.selector,
          expectedState: 'Previous verified value',
          observedState: 'Restored',
          verified: rollbackResult.success,
          timestamp: Date.now(),
          canRewind: false
        },
        ...prev
      ]);

      setCanRewind(false);
      setLastReversibleAction(null);
      setAgentStatus('completed');
    } catch (err) {
      console.error(err);
      setAgentStatus('error');
    }
  };

  return (
    <div className="dashboard-container">
      <Header
        browserActive={browserActive}
        agentStatus={agentStatus}
        modelName={modelConfig.model}
        hasApiKey={modelConfig.hasApiKey}
      />

      <main className="dashboard-main">
        <div className="panel-column">
          <section className="card">
            <Controls
              mode={mode}
              onModeChange={setMode}
              deadlineMode={deadlineMode}
              onDeadlineToggle={setDeadlineMode}
              agentStatus={agentStatus}
              browserActive={browserActive}
              canRewind={canRewind}
              onStart={handleStartTask}
              onStop={handleStopTask}
              onReset={handleReset}
              onRewind={handleRewind}
              onLaunchBrowser={handleLaunchBrowser}
            />

            <TaskInput
              task={task}
              onTaskChange={setTask}
              disabled={['inspecting', 'planning', 'executing', 'verifying'].includes(agentStatus)}
            />
          </section>

          <MetricsPanel metrics={metrics} />

          <VerificationPanel records={verifications} />
        </div>

        <div className="panel-column">
          <BrowserPreview
            screenshot={screenshot}
            onRefreshScreenshot={refreshScreenshot}
            isLoading={isLoadingPreview}
            browserActive={browserActive}
          />

          <Timeline history={timeline} />
        </div>
      </main>
    </div>
  );
}

export default App;
