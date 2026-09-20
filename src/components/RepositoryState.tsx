import { useGitStore } from '../store/gitStore';
import { GitBranch, FileText, Layers, Globe, GitCommitHorizontal } from 'lucide-react';
import { getBranchColor } from '../graph/branchColors';

export function RepositoryState() {
  const { gitState } = useGitStore();

  const headCommit = (() => {
    if (!gitState.initialized) return null;
    if (gitState.HEAD.type === 'commit') return gitState.commits[gitState.HEAD.value];
    const branch = gitState.branches.find(b => b.name === gitState.HEAD.value);
    return branch ? gitState.commits[branch.commitId] : null;
  })();

  const currentBranch = gitState.HEAD.type === 'branch' ? gitState.HEAD.value : '(detached)';

  if (!gitState.initialized) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <GitBranch size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Run git init to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-3 space-y-3">
      <div className="panel-card">
        <div className="panel-header">
          <GitBranch size={11} style={{ color: 'var(--accent-blue)' }} />
          <span>HEAD</span>
        </div>
        <div className="panel-body">
          <div className="flex items-center gap-2">
            <span className="mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>points to</span>
            <span className="mono text-[11px] font-bold" style={{ color: 'var(--accent-blue)' }}>{currentBranch}</span>
          </div>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <GitBranch size={11} style={{ color: 'var(--accent-green)' }} />
          <span>Branches</span>
          <span className="ml-auto mono text-[9px]" style={{ color: 'var(--text-muted)' }}>{gitState.branches.length}</span>
        </div>
        <div className="panel-body space-y-1">
          {gitState.branches.length === 0 ? (
            <span className="mono text-[10px]" style={{ color: 'var(--text-muted)' }}>No branches</span>
          ) : (
            gitState.branches.map((b) => {
              const color = getBranchColor(b.name);
              const isCurrent = b.name === currentBranch;
              return (
                <div key={b.name} className="flex items-center gap-2 py-0.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="mono text-[11px] flex-1 truncate" style={{ color: isCurrent ? color : 'var(--text-primary)' }}>
                    {isCurrent && '* '}{b.name}
                  </span>
                  <span className="mono text-[9px]" style={{ color: 'var(--text-muted)' }}>{b.commitId ? b.commitId.substring(0, 7) : ''}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <Layers size={11} style={{ color: 'var(--accent-yellow)' }} />
          <span>Staging</span>
          <span className="ml-auto mono text-[9px]" style={{ color: 'var(--text-muted)' }}>{Object.keys(gitState.stagingArea).length}</span>
        </div>
        <div className="panel-body">
          {Object.keys(gitState.stagingArea).length === 0 ? (
            <span className="mono text-[10px]" style={{ color: 'var(--text-muted)' }}>Empty</span>
          ) : (
            <div className="space-y-0.5">
              {Object.entries(gitState.stagingArea).map(([name]) => (
                <div key={name} className="flex items-center gap-1.5 mono text-[11px]" style={{ color: 'var(--accent-yellow)' }}>
                  <FileText size={9} />
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <FileText size={11} style={{ color: 'var(--accent-purple)' }} />
          <span>Working Tree</span>
          <span className="ml-auto mono text-[9px]" style={{ color: 'var(--text-muted)' }}>{Object.keys(gitState.workingTree).length}</span>
        </div>
        <div className="panel-body">
          {Object.keys(gitState.workingTree).length === 0 ? (
            <span className="mono text-[10px]" style={{ color: 'var(--text-muted)' }}>Empty</span>
          ) : (
            <div className="space-y-0.5">
              {Object.entries(gitState.workingTree).map(([name]) => (
                <div key={name} className="flex items-center gap-1.5 mono text-[11px]" style={{ color: 'var(--accent-purple)' }}>
                  <FileText size={9} />
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {gitState.remotes.length > 0 && (
        <div className="panel-card">
          <div className="panel-header">
            <Globe size={11} style={{ color: 'var(--accent-red)' }} />
            <span>Remotes</span>
          </div>
          <div className="panel-body space-y-1.5">
            {gitState.remotes.map((r) => (
              <div key={r.name} className="mono text-[10px]">
                <div style={{ color: 'var(--accent-red)' }}>{r.name}</div>
                {r.branches.map((rb) => (
                  <div key={rb.name} className="ml-3 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: getBranchColor(rb.name) }}>origin/{rb.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                    <span>{rb.commitId.substring(0, 7)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {headCommit && (
        <div className="panel-card">
          <div className="panel-header">
            <GitCommitHorizontal size={11} style={{ color: 'var(--text-secondary)' }} />
            <span>Current Commit</span>
          </div>
          <div className="panel-body space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="mono text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>id</span>
              <span className="mono text-[11px] font-bold" style={{ color: 'var(--accent-blue)' }}>{headCommit.id.substring(0, 7)}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mono text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>msg</span>
              <span className="mono text-[11px]" style={{ color: 'var(--text-primary)' }}>{headCommit.message}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mono text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>par</span>
              <span className="mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {headCommit.parentIds.map(p => p.substring(0, 7)).join(', ') || 'none'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mono text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>files</span>
              <span className="mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {Object.keys(headCommit.files).join(', ') || 'none'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
