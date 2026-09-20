import { useState } from 'react';
import { useGitStore } from '../store/gitStore';
import { Terminal } from '../components/Terminal';
import { GitGraph } from '../components/GitGraph';
import { ExplanationPanel } from '../components/ExplanationPanel';
import { CommandHistory } from '../components/CommandHistory';
import { RepositoryState } from '../components/RepositoryState';
import { GitBranch, Home, Undo2, Redo2, RotateCcw, ChevronLeft, ChevronRight, Info, Layers } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export function GitLabPage() {
  const { undo, redo, resetSimulation, history, historyIndex, setCurrentPage } = useGitStore();
  const [rightTab, setRightTab] = useState<'state' | 'explanation'>('state');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <header className="flex items-center justify-between px-4 h-11 border-b flex-shrink-0" style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage('landing')} className="flex items-center gap-1.5 p-1 rounded transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }} title="Home">
            <Home size={14} />
          </button>
          <div className="flex items-center gap-2">
            <GitBranch size={16} style={{ color: 'var(--accent-blue)' }} />
            <span className="font-semibold text-xs tracking-wide" style={{ color: 'var(--text-primary)' }}>GIT VISUALIZER</span>
          </div>
          <span className="text-[10px] hidden sm:inline" style={{ color: 'var(--text-muted)' }}>See what Git actually does</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 rounded transition-colors disabled:opacity-25 hover:opacity-80" style={{ color: 'var(--text-secondary)' }} title="Undo">
            <Undo2 size={13} />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded transition-colors disabled:opacity-25 hover:opacity-80" style={{ color: 'var(--text-secondary)' }} title="Redo">
            <Redo2 size={13} />
          </button>
          <button onClick={() => resetSimulation(true)} className="p-1.5 rounded transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }} title="Reset Simulation">
            <RotateCcw size={13} />
          </button>
          <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />
          <ThemeToggle />
        </div>
      </header>

      <div className="hidden md:flex flex-1 overflow-hidden">
        <div
          className="flex-shrink-0 border-r overflow-hidden transition-all duration-300"
          style={{
            backgroundColor: 'var(--panel-bg)',
            borderColor: 'var(--border-color)',
            width: leftCollapsed ? '36px' : '200px',
          }}
        >
          {leftCollapsed ? (
            <div className="flex flex-col items-center py-2">
              <button onClick={() => setLeftCollapsed(false)} className="p-1.5 rounded transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }} title="Expand History">
                <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <CommandHistory onCollapse={() => setLeftCollapsed(true)} />
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="h-[180px] border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
            <Terminal />
          </div>
          <div className="flex-1 overflow-hidden relative">
            <GitGraph />
          </div>
        </div>

        <div
          className="flex-shrink-0 border-l overflow-hidden transition-all duration-300"
          style={{
            backgroundColor: 'var(--panel-bg)',
            borderColor: 'var(--border-color)',
            width: rightCollapsed ? '36px' : '280px',
          }}
        >
          {rightCollapsed ? (
            <div className="flex flex-col items-center py-2">
              <button onClick={() => setRightCollapsed(false)} className="p-1.5 rounded transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }} title="Expand Panel">
                <ChevronLeft size={14} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
                <button onClick={() => setRightTab('state')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-colors"
                  style={{
                    color: rightTab === 'state' ? 'var(--accent-blue)' : 'var(--text-muted)',
                    borderBottom: rightTab === 'state' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  }}>
                  <Layers size={11} /> State
                </button>
                <button onClick={() => setRightTab('explanation')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-colors"
                  style={{
                    color: rightTab === 'explanation' ? 'var(--accent-blue)' : 'var(--text-muted)',
                    borderBottom: rightTab === 'explanation' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  }}>
                  <Info size={11} /> Explain
                </button>
                <button onClick={() => setRightCollapsed(true)} className="px-2 py-2 transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }} title="Collapse Panel">
                  <ChevronRight size={12} />
                </button>
              </div>
              <div className="overflow-y-auto" style={{ height: 'calc(100% - 36px)' }}>
                {rightTab === 'state' ? <RepositoryState /> : <ExplanationPanel />}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="md:hidden flex-1 flex flex-col overflow-hidden">
        <div className="flex border-b" style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border-color)' }}>
          {[
            { id: 'terminal' as const, label: 'Terminal' },
            { id: 'graph' as const, label: 'Graph' },
            { id: 'state' as const, label: 'State' },
            { id: 'explain' as const, label: 'Explain' },
            { id: 'history' as const, label: 'History' },
          ].map((tab) => (
            <button key={tab.id} onClick={() => {}} className="flex-1 flex items-center justify-center px-2 py-2.5 text-[11px] font-semibold transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          <Terminal />
        </div>
      </div>
    </div>
  );
}
