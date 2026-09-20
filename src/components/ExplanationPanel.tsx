import { useGitStore } from '../store/gitStore';
import { Info, Lightbulb, Code, Cpu, BookOpen } from 'lucide-react';

export function ExplanationPanel() {
  const { explanations } = useGitStore();
  const latest = explanations[explanations.length - 1];

  if (!latest) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <BookOpen size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Run a command to see explanations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-3 space-y-3">
      <div className="panel-card">
        <div className="panel-header">
          <Code size={11} style={{ color: 'var(--accent-blue)' }} />
          <span>Command</span>
        </div>
        <div className="panel-body">
          <code className="mono text-[12px] font-bold" style={{ color: 'var(--accent-blue)' }}>{latest.command}</code>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <Info size={11} style={{ color: 'var(--accent-green)' }} />
          <span>What Happened</span>
        </div>
        <div className="panel-body">
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{latest.explanation}</p>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <Lightbulb size={11} style={{ color: 'var(--accent-yellow)' }} />
          <span>Output</span>
        </div>
        <div className="panel-body">
          <pre className="mono text-[11px] whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{latest.output}</pre>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <Cpu size={11} style={{ color: 'var(--accent-purple)' }} />
          <span>Under the Hood</span>
        </div>
        <div className="panel-body">
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The Git engine processed your command, updated the internal repository state,
            and all UI panels (graph, staging area, branches, HEAD) were re-rendered
            from the new state.
          </p>
        </div>
      </div>
    </div>
  );
}
