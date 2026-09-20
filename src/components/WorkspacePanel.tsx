import { useGitStore } from '../store/gitStore';
import { FolderOpen, FilePlus, FileEdit } from 'lucide-react';

export function WorkspacePanel() {
  const { gitState } = useGitStore();
  const files = Object.keys(gitState.workingTree);
  const stagedFiles = Object.keys(gitState.stagingArea);

  const getFileStatus = (filename: string): 'new' | 'modified' => {
    if (gitState.HEAD.type === 'branch') {
      const branch = gitState.branches.find(b => b.name === gitState.HEAD.value);
      if (branch) {
        const headCommit = gitState.commits[branch.commitId];
        if (headCommit && filename in headCommit.files) return 'modified';
      }
    }
    return 'new';
  };

  return (
    <div className="h-full overflow-y-auto p-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex items-center gap-2 mb-3">
        <FolderOpen size={14} style={{ color: 'var(--accent-yellow)' }} />
        <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>Workspace</h2>
        <span className="mono text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{files.length}</span>
      </div>
      {files.length === 0 ? (
        <div className="text-center py-6">
          <FolderOpen size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No files</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {files.map((filename) => {
            const status = getFileStatus(filename);
            const isStaged = stagedFiles.includes(filename);
            return (
              <div key={filename} className="flex items-center gap-2 px-2 py-1.5 rounded transition-colors"
                style={{ backgroundColor: isStaged ? 'var(--accent-green-bg)' : 'transparent', border: `1px solid ${isStaged ? 'rgba(63,185,80,0.2)' : 'transparent'}` }}>
                {status === 'new' ? <FilePlus size={11} style={{ color: 'var(--accent-green)' }} /> : <FileEdit size={11} style={{ color: 'var(--accent-yellow)' }} />}
                <span className="mono text-[11px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{filename}</span>
                <span className="mono text-[8px] px-1 rounded" style={{ backgroundColor: status === 'new' ? 'var(--accent-green-bg)' : 'rgba(210,153,34,0.1)', color: status === 'new' ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>
                  {status}
                </span>
                {isStaged && <span className="mono text-[8px] px-1 rounded" style={{ backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>staged</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
