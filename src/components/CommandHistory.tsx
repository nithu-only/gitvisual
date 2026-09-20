import { useGitStore } from '../store/gitStore';
import { History, ChevronLeft, Trash2 } from 'lucide-react';

interface CommandHistoryProps {
  onCollapse?: () => void;
}

export function CommandHistory({ onCollapse }: CommandHistoryProps) {
  const { gitState, history, historyIndex, setGitState } = useGitStore();

  const handleClear = () => {
    const store = useGitStore.getState();
    store.resetSimulation(true);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <History size={12} style={{ color: 'var(--text-muted)' }} />
          <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>History</span>
        </div>
        <button onClick={onCollapse} className="p-1 rounded transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }} title="Collapse">
          <ChevronLeft size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {gitState.commandHistory.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <History size={20} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No commands yet</p>
          </div>
        ) : (
          <div className="space-y-0">
            {gitState.commandHistory.map((cmd, i) => {
              const isActive = i === historyIndex - 1;
              const isPast = i < historyIndex - 1;
              const isFuture = i > historyIndex - 1;
              const num = String(i + 1).padStart(2, '0');

              return (
                <button
                  key={i}
                  onClick={() => {
                    const stateAtIndex = history[i + 1];
                    if (stateAtIndex) setGitState(stateAtIndex);
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-start gap-2 transition-all duration-150"
                  style={{
                    backgroundColor: isActive ? 'var(--accent-blue-bg)' : 'transparent',
                    opacity: isFuture ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span className="mono text-[9px] font-bold mt-0.5 flex-shrink-0 w-5 text-right" style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                    {num}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="mono text-[11px] truncate" style={{ color: isActive ? 'var(--accent-blue)' : isPast ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {cmd}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--accent-blue)' }} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {gitState.commandHistory.length > 0 && (
        <div className="px-3 py-2 border-t flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors w-full justify-center"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-red)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <Trash2 size={10} /> Clear
          </button>
        </div>
      )}
    </div>
  );
}
