import { useState, useRef, useCallback } from 'react';
import { useGitStore } from '../store/gitStore';
import { Terminal } from '../components/Terminal';
import { GitGraph } from '../components/GitGraph';
import { ExplanationPanel } from '../components/ExplanationPanel';
import { CommandHistory } from '../components/CommandHistory';
import { RepositoryState } from '../components/RepositoryState';
import { GitBranch, Home, Undo2, Redo2, RotateCcw, ChevronLeft, ChevronRight, Info, Layers, History, X } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

type MobilePanel = 'state' | 'history' | 'explain' | null;

export function GitLabPage() {
  const { undo, redo, resetSimulation, history, historyIndex, setCurrentPage } = useGitStore();
  const [rightTab, setRightTab] = useState<'state' | 'explanation'>('state');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(180);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = terminalHeight;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [terminalHeight]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientY - startY.current;
    const newHeight = Math.min(Math.max(startHeight.current + delta, 80), 500);
    setTerminalHeight(newHeight);
    window.dispatchEvent(new Event('resize'));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const mobilePanelTitle = mobilePanel === 'state' ? 'State' : mobilePanel === 'history' ? 'History' : 'Explain';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <header className="flex items-center justify-between px-2 sm:px-4 h-11 border-b flex-shrink-0" style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button onClick={() => setCurrentPage('landing')} className="flex items-center justify-center w-9 h-9 rounded transition-colors hover:opacity-80 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} title="Home">
            <Home size={14} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <GitBranch size={16} style={{ color: 'var(--accent-blue)' }} className="flex-shrink-0" />
            <span className="font-semibold text-xs tracking-wide truncate" style={{ color: 'var(--text-primary)' }}>GIT VISUALIZER</span>
          </div>
          <span className="text-[10px] hidden sm:inline" style={{ color: 'var(--text-muted)' }}>See what Git actually does</span>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
          <button onClick={undo} disabled={historyIndex <= 0} className="w-9 h-9 flex items-center justify-center rounded transition-colors disabled:opacity-25 hover:opacity-80" style={{ color: 'var(--text-secondary)' }} title="Undo">
            <Undo2 size={13} />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="w-9 h-9 flex items-center justify-center rounded transition-colors disabled:opacity-25 hover:opacity-80" style={{ color: 'var(--text-secondary)' }} title="Redo">
            <Redo2 size={13} />
          </button>
          <button onClick={() => resetSimulation(true)} className="w-9 h-9 flex items-center justify-center rounded transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }} title="Reset Simulation">
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
          <div style={{ height: terminalHeight, flexShrink: 0, borderColor: 'var(--border-color)' }}>
            <Terminal />
          </div>
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'ns-resize', borderColor: 'var(--border-color)', touchAction: 'none' }}
            className="h-[5px] flex-shrink-0 flex items-center justify-center border-b group"
          >
            <div className="w-8 h-[3px] rounded-full transition-colors" style={{ backgroundColor: 'var(--border-color)' }} />
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

      {/* Mobile: stacked Terminal + Graph; State / History / Explain as drawers */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden relative">
        <div className="flex border-b flex-shrink-0" style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border-color)' }}>
          {([
            { id: 'state' as const, label: 'State', icon: Layers },
            { id: 'history' as const, label: 'History', icon: History },
            { id: 'explain' as const, label: 'Explain', icon: Info },
          ]).map((item) => {
            const Icon = item.icon;
            const active = mobilePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setMobilePanel(active ? null : item.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors"
                style={{
                  color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
                  backgroundColor: active ? 'var(--accent-blue-bg)' : 'transparent',
                  borderBottom: active ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  minHeight: 40,
                }}
                aria-pressed={active}
              >
                <Icon size={12} /> {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div style={{ height: terminalHeight, flexShrink: 0, borderColor: 'var(--border-color)' }}>
            <Terminal />
          </div>
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'ns-resize', borderColor: 'var(--border-color)', touchAction: 'none' }}
            className="h-[8px] flex-shrink-0 flex items-center justify-center border-b"
          >
            <div className="w-10 h-[3px] rounded-full" style={{ backgroundColor: 'var(--border-color)' }} />
          </div>
          <div className="flex-1 overflow-hidden relative min-h-0">
            <GitGraph />
          </div>
        </div>

        {mobilePanel && (
          <div className="absolute inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={mobilePanelTitle}>
            <div
              className="absolute inset-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
              onClick={() => setMobilePanel(null)}
            />
            <div
              className="absolute top-0 right-0 h-full w-[85vw] max-w-[340px] flex flex-col border-l animate-slideIn"
              style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>{mobilePanelTitle}</span>
                <button
                  onClick={() => setMobilePanel(null)}
                  className="w-9 h-9 flex items-center justify-center rounded transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {mobilePanel === 'state' && <RepositoryState />}
                {mobilePanel === 'history' && <CommandHistory onCollapse={() => setMobilePanel(null)} />}
                {mobilePanel === 'explain' && <ExplanationPanel />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
