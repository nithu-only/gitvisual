import { useState, useRef, useEffect, useCallback } from 'react';
import { useGitStore } from '../store/gitStore';
import { Terminal as TerminalIcon, ChevronRight } from 'lucide-react';

export function Terminal() {
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const { executeCommand, gitState } = useGitStore();
  const [outputLines, setOutputLines] = useState<Array<{ type: 'input' | 'output' | 'info' | 'error' | 'success'; text: string }>>([
    { type: 'info', text: 'Welcome to Git Visualizer' },
    { type: 'info', text: 'Try: git init → git add . → git commit -m "first commit"' },
    { type: 'info', text: '' },
  ]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputLines]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const result = executeCommand(input);
    const isError = result?.output?.includes('fatal:') || result?.output?.includes('error:') || result?.output?.includes('nothing to commit');
    const isSuccess = !isError && result?.output && !result.output.includes('Warning');
    setCmdHistory((prev) => [...prev, input]);
    setHistoryIndex(-1);
    setOutputLines((prev) => [
      ...prev,
      { type: 'input', text: input },
      { type: isError ? 'error' : isSuccess ? 'success' : 'output', text: result?.output || 'Command executed.' },
    ]);
    setInput('');
  }, [input, executeCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const newIndex = historyIndex < cmdHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(cmdHistory[cmdHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(cmdHistory[cmdHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }, [cmdHistory, historyIndex]);

  const currentBranch = gitState.HEAD.type === 'branch' ? gitState.HEAD.value : 'HEAD';

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--terminal-bg)' }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <TerminalIcon size={12} style={{ color: 'var(--text-muted)' }} />
          <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>Terminal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: gitState.initialized ? 'var(--accent-green)' : 'var(--accent-red)' }} />
          <span className="mono text-[10px]" style={{ color: 'var(--accent-blue)' }}>git ({currentBranch})</span>
        </div>
      </div>
      <div ref={outputRef} className="flex-1 overflow-y-auto px-4 py-3 mono text-[13px] leading-relaxed">
        {outputLines.map((line, i) => (
          <div key={i} className="mb-0.5">
            {line.type === 'input' ? (
              <div className="flex items-start gap-1.5">
                <ChevronRight size={12} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                <span style={{ color: 'var(--accent-green)' }}>{line.text}</span>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap pl-4 text-[12px]" style={{
                color: line.type === 'error' ? 'var(--accent-red)' : line.type === 'success' ? 'var(--accent-green)' : line.type === 'info' ? 'var(--text-muted)' : 'var(--text-secondary)'
              }}>{line.text}</pre>
            )}
          </div>
        ))}
        <form onSubmit={handleSubmit} className="flex items-center mt-1">
          <ChevronRight size={12} className="flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none mono text-[13px] ml-1.5"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Type a git command..."
            autoFocus
            spellCheck={false}
          />
        </form>
      </div>
    </div>
  );
}
