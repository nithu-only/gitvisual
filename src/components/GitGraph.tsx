import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type OnNodeDrag,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGitStore } from '../store/gitStore';
import { CommitNode } from '../graph/CommitNode';
import { gitStateToGraph } from '../graph/gitToGraph';
import { calculateAutoLayout } from '../graph/layoutEngine';
import { getBranchColor } from '../graph/branchColors';
import type { CommitNode as CommitNodeType, GraphLayoutState } from '../graph/types';
import { LayoutGrid, RotateCcw, Maximize } from 'lucide-react';

const nodeTypes = { commit: CommitNode };

function GitGraphInner() {
  const { gitState, theme } = useGitStore();
  const isDark = theme === 'dark';
  const { fitView, setNodes, setEdges, zoomIn, zoomOut, getZoom } = useReactFlow();
  const [savedPositions, setSavedPositions] = useState<GraphLayoutState>({});
  const [isLayouting, setIsLayouting] = useState(false);
  const prevCommitCount = useRef(0);
  const [zoomLevel, setZoomLevel] = useState(100);

  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => gitStateToGraph(gitState, savedPositions),
    [gitState, savedPositions]
  );

  useEffect(() => {
    setNodes(baseNodes);
    setEdges(baseEdges);
  }, [baseNodes, baseEdges, setNodes, setEdges]);

  const commitCount = Object.keys(gitState.commits).length;

  useEffect(() => {
    if (commitCount > prevCommitCount.current && commitCount > 0 && Object.keys(savedPositions).length === 0) {
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
    }
    prevCommitCount.current = commitCount;
  }, [commitCount, fitView, savedPositions]);

  const onNodeDrag: OnNodeDrag = useCallback((_, node) => {
    setSavedPositions(prev => ({
      ...prev,
      [node.id]: { x: node.position.x, y: node.position.y },
    }));
  }, []);

  const onNodeDoubleClick: NodeMouseHandler<CommitNodeType> = useCallback((_, node) => {
    const commit = node.data.commit;
    const store = useGitStore.getState();
    store.executeCommand(`git log --oneline -1 ${commit.id.substring(0, 7)}`);
  }, []);

  const handleAutoLayout = useCallback(async () => {
    setIsLayouting(true);
    try {
      const positions = await calculateAutoLayout(baseNodes, baseEdges, gitState.branchCreationPoints || {});
      const updatedNodes = baseNodes.map(n => ({
        ...n,
        position: positions[n.id] || n.position,
      }));
      setNodes(updatedNodes);
      setSavedPositions({});
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
    } catch (err) {
      console.error('Auto layout failed:', err);
    }
    setIsLayouting(false);
  }, [baseNodes, baseEdges, setNodes, fitView, gitState.branchCreationPoints]);

  const handleResetLayout = useCallback(() => {
    setSavedPositions({});
    const freshNodes = gitStateToGraph(gitState).nodes;
    setNodes(freshNodes);
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
  }, [gitState, setNodes, fitView]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
    setTimeout(() => setZoomLevel(Math.round(getZoom() * 100)), 250);
  }, [zoomIn, getZoom]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
    setTimeout(() => setZoomLevel(Math.round(getZoom() * 100)), 250);
  }, [zoomOut, getZoom]);

  const branchLegend = useMemo(() => {
    const branchNames = new Set<string>();
    baseNodes.forEach(n => {
      const b = n.data.branchName;
      if (b) branchNames.add(b);
    });
    gitState.remotes.forEach(r => {
      r.branches.forEach(rb => branchNames.add(`origin/${rb.name}`));
    });
    return Array.from(branchNames).sort().map(name => ({
      name,
      color: getBranchColor(name),
      isRemote: name.startsWith('origin/'),
      isCurrent: gitState.HEAD.type === 'branch' && gitState.HEAD.value === name,
    }));
  }, [baseNodes, gitState.remotes, gitState.HEAD]);

  const bgPrimary = isDark ? '#0d1117' : '#f8f9fb';
  const bgSecondary = isDark ? '#161b22' : '#ffffff';
  const borderColor = isDark ? '#30363d' : '#d8dee4';

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={baseNodes}
        edges={baseEdges}
        nodeTypes={nodeTypes}
        onNodeDrag={onNodeDrag}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        style={{ background: bgPrimary }}
        nodesDraggable
        nodesConnectable={false}
        deleteKeyCode={null}
        onMove={() => setZoomLevel(Math.round(getZoom() * 100))}
      >
        <Background color={isDark ? '#21262d' : '#e8ecf0'} gap={20} size={1} />
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as Record<string, unknown>;
            return (d.branchColor as string) || (isDark ? '#6e7681' : '#8b949e');
          }}
          maskColor={isDark ? 'rgba(13,17,23,0.8)' : 'rgba(248,249,251,0.8)'}
          style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, borderRadius: 6 }}
        />
      </ReactFlow>

      <div className="absolute top-3 left-3 flex items-center gap-1 z-10">
        <button
          onClick={handleAutoLayout}
          disabled={isLayouting}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150 disabled:opacity-40"
          style={{ backgroundColor: '#1f6feb', color: 'white' }}
          title="Auto arrange commits and branches"
        >
          <LayoutGrid size={12} /> {isLayouting ? 'Layouting...' : 'Auto Layout'}
        </button>
        <button
          onClick={handleResetLayout}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150"
          style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, color: 'var(--text-secondary)' }}
          title="Reset manual node positions"
        >
          <RotateCcw size={12} /> Reset
        </button>
        <button
          onClick={handleFitView}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150"
          style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, color: 'var(--text-secondary)' }}
          title="Fit entire graph into view"
        >
          <Maximize size={12} /> Fit
        </button>
        <div className="flex items-center gap-0.5 ml-1 rounded-md" style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}` }}>
          <button onClick={handleZoomOut} className="px-1.5 py-1.5 text-[11px] font-bold transition-colors" style={{ color: 'var(--text-secondary)' }} title="Zoom Out">−</button>
          <span className="px-1 text-[10px] mono font-semibold min-w-[32px] text-center" style={{ color: 'var(--text-muted)' }}>{zoomLevel}%</span>
          <button onClick={handleZoomIn} className="px-1.5 py-1.5 text-[11px] font-bold transition-colors" style={{ color: 'var(--text-secondary)' }} title="Zoom In">+</button>
        </div>
      </div>

      {branchLegend.length > 0 && (
        <div className="absolute top-3 right-3 z-10 rounded-md" style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}` }}>
          <div className="px-2.5 py-1.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Branches</span>
          </div>
          <div className="px-2.5 py-1.5 space-y-1">
            {branchLegend.map(b => (
              <div key={b.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color, opacity: b.isRemote ? 0.6 : 1 }} />
                <span className="mono text-[10px]" style={{ color: b.isCurrent ? b.color : 'var(--text-primary)' }}>{b.name}</span>
                {b.isCurrent && <span className="text-[8px] font-bold px-1 rounded" style={{ backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>HEAD</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {baseNodes.length > 0 && (
        <div className="absolute bottom-3 left-3 text-[9px] mono z-10 px-2 py-1 rounded-md" style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, color: 'var(--text-muted)' }}>
          {baseNodes.length} commits · {baseEdges.length} edges
        </div>
      )}
    </div>
  );
}

export function GitGraph() {
  return (
    <ReactFlowProvider>
      <GitGraphInner />
    </ReactFlowProvider>
  );
}
