import { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { CommitNodeData } from './types';
import { useGitStore } from '../store/gitStore';
import { getBranchColor } from './branchColors';

interface CommitNodeProps {
  data: CommitNodeData;
  selected?: boolean;
}

function CommitNodeComponent({ data, selected }: CommitNodeProps) {
  const { theme } = useGitStore();
  const isDark = theme === 'dark';
  const [showDebug, setShowDebug] = useState(false);

  const { shortId, message, isHead, isMerge, timestamp, branchColor, branchName, branchCreationPoint } = data;
  const branches = (data.branches as string[]) || [];
  const commit = data.commit as { id: string; parentIds: string[]; createdOnBranch?: string } | undefined;

  const handleNodeClick = useCallback(() => {
    setShowDebug(prev => !prev);
  }, []);

  const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="relative" style={{ minWidth: 130, maxWidth: 200 }} onClick={handleNodeClick}>
      {branchCreationPoint && (
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded text-[8px] font-bold z-10"
          style={{
            backgroundColor: getBranchColor(branchCreationPoint),
            color: 'white',
            boxShadow: `0 2px 8px ${getBranchColor(branchCreationPoint)}40`,
          }}
        >
          Branch "{branchCreationPoint}" created here
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 6,
          height: 6,
          background: branchColor,
          border: `2px solid ${branchColor}`,
          top: '50%',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 6,
          height: 6,
          background: branchColor,
          border: `2px solid ${branchColor}`,
          top: '50%',
        }}
      />

      {Array.isArray(branches) && branches.length > 0 && (
        <div className="flex gap-1 mb-0.5 flex-wrap" style={{ justifyContent: 'center' }}>
          {branches.map(name => (
            <span
              key={name}
              className="text-[8px] font-bold px-1.5 py-px rounded-sm text-white whitespace-nowrap"
              style={{ backgroundColor: getBranchColor(name) }}
            >
              {name}
            </span>
          ))}
        </div>
      )}

      <div
        className="rounded-md px-2.5 py-1.5 transition-all duration-150"
        style={{
          backgroundColor: isHead
            ? (isDark ? 'rgba(88,166,255,0.08)' : 'rgba(88,166,255,0.06)')
            : (isDark ? '#161b22' : '#ffffff'),
          border: `1.5px solid ${selected ? '#58a6ff' : branchColor}`,
          boxShadow: isHead
            ? `0 0 8px ${branchColor}30`
            : 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-center gap-1 mb-0.5">
          <span className="mono text-[9px] font-bold" style={{ color: branchColor }}>{shortId}</span>
          {isMerge && (
            <span className="text-[7px] px-1 rounded font-bold" style={{ backgroundColor: 'rgba(210,153,34,0.15)', color: '#d29922' }}>
              merge
            </span>
          )}
          {isHead && (
            <span className="text-[7px] px-1 rounded font-bold text-white" style={{ backgroundColor: '#f85149' }}>
              HEAD
            </span>
          )}
        </div>
        <div className="text-[10px] font-medium leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{message}</div>
        <div className="text-[8px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{timeStr}</div>
      </div>

      {showDebug && commit && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 px-3 py-2 rounded-md text-left whitespace-nowrap"
          style={{
            backgroundColor: isDark ? '#1c2128' : '#ffffff',
            border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontSize: 10,
            lineHeight: '16px',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Debug: Commit</div>
          <div><span style={{ color: 'var(--text-muted)' }}>ID: </span><span style={{ color: branchColor, fontFamily: 'monospace' }}>{shortId}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Created on branch: </span><span style={{ color: getBranchColor(commit.createdOnBranch || branchName), fontWeight: 700 }}>{commit.createdOnBranch || branchName}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Parent: </span><span style={{ fontFamily: 'monospace' }}>{commit.parentIds.length > 0 ? commit.parentIds[0].substring(0, 7) : '(root)'}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Graph branch: </span><span style={{ color: branchColor, fontWeight: 700 }}>{branchName}</span></div>
        </div>
      )}
    </div>
  );
}

export const CommitNode = memo(CommitNodeComponent);
