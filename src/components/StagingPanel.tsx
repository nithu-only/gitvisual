import { useGitStore } from '../store/gitStore';
import { Layers, FileText, Check } from 'lucide-react';

export function StagingPanel() {
  const { gitState } = useGitStore();
  const stagedFiles = Object.keys(gitState.stagingArea);

  return (
    <div className="h-full overflow-y-auto p-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Layers size={14} style={{ color: 'var(--accent-blue)' }} />
        <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>Staging Area</h2>
        <span className="mono text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{stagedFiles.length}</span>
      </div>
      {stagedFiles.length === 0 ? (
        <div className="text-center py-6">
          <Layers size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Empty</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {stagedFiles.map((filename) => (
            <div key={filename} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ backgroundColor: 'var(--accent-blue-bg)', border: '1px solid rgba(88,166,255,0.15)' }}>
              <Check size={11} style={{ color: 'var(--accent-green)' }} />
              <FileText size={11} style={{ color: 'var(--accent-blue)' }} />
              <span className="mono text-[11px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{filename}</span>
              <span className="mono text-[8px] px-1 rounded" style={{ backgroundColor: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>ready</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
