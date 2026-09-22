import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGitStore } from '../store/gitStore';
import { CommitNode } from '../graph/CommitNode';
import { gitStateToGraph } from '../graph/gitToGraph';
import { calculateAutoLayout } from '../graph/layoutEngine';
import { getBranchColor } from '../graph/branchColors';
import { recomputeEdgeHandles } from '../graph/smartHandles';
import { saveSession, loadSession } from '../store/persistence';
import type { GraphLayoutState } from '../graph/types';
import type { CommitNode as CommitNodeType } from '../graph/types';
import { LayoutGrid, RotateCcw, Maximize, Save, Upload, Settings } from 'lucide-react';

const nodeTypes = { commit: CommitNode };

function GitGraphInner() {
  const { gitState, theme, restoredSessionSeen, setRestoredSessionSeen, saveProject, importProject, gitIdentity, setGitIdentity } = useGitStore();
  const isDark = theme === 'dark';
  const { fitView, setNodes, setEdges, zoomIn, zoomOut, getZoom, getNodes } = useReactFlow();
  const [savedPositions, setSavedPositions] = useState<GraphLayoutState>(
    () => loadSession()?.savedPositions ?? {}
  );
  const [isLayouting, setIsLayouting] = useState(false);
  const prevCommitCount = useRef(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showRestored, setShowRestored] = useState(() => !restoredSessionSeen && loadSession() !== null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importProject(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import project.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [importProject]);

  const [showSettings, setShowSettings] = useState(false);
  const [settingsName, setSettingsName] = useState(gitIdentity.name);
  const [settingsEmail, setSettingsEmail] = useState(gitIdentity.email);

  const handleSaveSettings = useCallback(() => {
    setGitIdentity({ name: settingsName, email: settingsEmail });
    setShowSettings(false);
  }, [settingsName, settingsEmail, setGitIdentity]);

  useEffect(() => {
    if (showRestored) {
      const t = setTimeout(() => {
        setShowRestored(false);
        setRestoredSessionSeen();
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [showRestored, setRestoredSessionSeen]);

  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => gitStateToGraph(gitState, savedPositions),
    [gitState, savedPositions]
  );

  const persistPositions = useCallback((positions: GraphLayoutState) => {
    const s = useGitStore.getState();
    saveSession({
      gitState: s.gitState,
      history: s.history,
      historyIndex: s.historyIndex,
      explanations: s.explanations,
      savedPositions: positions,
      theme: s.theme,
    });
  }, []);

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

  const isDragging = useRef(false);

  const onNodeDrag: OnNodeDrag = useCallback((_, node) => {
    isDragging.current = true;
    setSavedPositions(prev => {
      const next = { ...prev, [node.id]: { x: node.position.x, y: node.position.y } };
      return next;
    });
  }, [setSavedPositions]);

  const onNodeDragStop: OnNodeDrag = useCallback((_, node) => {
    isDragging.current = false;
    setSavedPositions(prev => {
      const next = { ...prev, [node.id]: { x: node.position.x, y: node.position.y } };
      persistPositions(next);
      return next;
    });
  }, [setSavedPositions, persistPositions]);

  const onNodesChange = useCallback((changes: any[]) => {
    // Detect drag start/end.
    const dragChanges = changes.filter(
      (c: any) => c.type === 'position' && typeof c.dragging === 'boolean'
    );
    if (dragChanges.length > 0) {
      isDragging.current = dragChanges.some((c: any) => c.dragging);
    }

    // During drag, recompute edge positions based on live node positions.
    if (isDragging.current) {
      const liveNodes = getNodes();
      const positions = new Map<string, { x: number; y: number }>();
      liveNodes.forEach(n => {
        positions.set(n.id, n.position);
      });
      setEdges(prevEdges => recomputeEdgeHandles(prevEdges, positions));
    }
  }, [getNodes, setEdges]);

  const onNodeDoubleClick = useCallback((_: unknown, node: CommitNodeType) => {
    const commit = node.data.commit as { id: string };
    const store = useGitStore.getState();
    store.executeCommand(`git log --oneline -1 ${commit.id.substring(0, 7)}`);
  }, []);

  const handleAutoLayout = useCallback(async () => {
    setIsLayouting(true);
    try {
      const positions = await calculateAutoLayout(baseNodes, baseEdges);
      const updatedNodes = baseNodes.map(n => ({
        ...n,
        position: positions[n.id] || n.position,
      }));
      setNodes(updatedNodes);
      setSavedPositions(positions);
      persistPositions(positions);
      setEdges(recomputeEdgeHandles(baseEdges, new Map(
        updatedNodes.map(n => [n.id, n.position] as [string, { x: number; y: number }])
      )));
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
    } catch (err) {
      console.error('Auto layout failed:', err);
    }
    setIsLayouting(false);
  }, [baseNodes, baseEdges, setNodes, setEdges, fitView, gitState, gitState.branchCreationPoints]);

  const handleResetLayout = useCallback(() => {
    setSavedPositions({});
    persistPositions({});
    const freshGraph = gitStateToGraph(gitState);
    setNodes(freshGraph.nodes);
    setEdges(recomputeEdgeHandles(freshGraph.edges, new Map(
      freshGraph.nodes.map(n => [n.id, n.position] as [string, { x: number; y: number }])
    )));
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
  }, [gitState, setNodes, setEdges, fitView]);

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
        onNodeDragStop={onNodeDragStop}
        onNodesChange={onNodesChange}
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

      <div className="absolute top-3 left-3 right-3 md:right-auto flex flex-wrap md:flex-nowrap items-center gap-1 z-10">
        <button
          onClick={handleAutoLayout}
          disabled={isLayouting}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[11px] font-semibold transition-all duration-150 disabled:opacity-40"
          style={{ backgroundColor: '#1f6feb', color: 'white' }}
          title="Auto arrange commits and branches"
        >
          <LayoutGrid size={12} /> {isLayouting ? 'Layouting...' : 'Auto Layout'}
        </button>
        <button
          onClick={handleResetLayout}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[11px] font-semibold transition-all duration-150"
          style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, color: 'var(--text-secondary)' }}
          title="Reset manual node positions"
        >
          <RotateCcw size={12} /> Reset
        </button>
        <button
          onClick={handleFitView}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[11px] font-semibold transition-all duration-150"
          style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, color: 'var(--text-secondary)' }}
          title="Fit entire graph into view"
        >
          <Maximize size={12} /> Fit
        </button>
        <div className="flex items-center gap-0.5 ml-1 rounded-md" style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}` }}>
          <button onClick={handleZoomOut} className="px-2 py-2 text-[11px] font-bold transition-colors" style={{ color: 'var(--text-secondary)' }} title="Zoom Out">−</button>
          <span className="px-1 text-[10px] mono font-semibold min-w-[32px] text-center" style={{ color: 'var(--text-muted)' }}>{zoomLevel}%</span>
          <button onClick={handleZoomIn} className="px-2 py-2 text-[11px] font-bold transition-colors" style={{ color: 'var(--text-secondary)' }} title="Zoom In">+</button>
        </div>
        <div className="w-px h-4 mx-0.5 hidden sm:block" style={{ backgroundColor: borderColor }} />
        <button
          onClick={saveProject}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[11px] font-semibold transition-all duration-150"
          style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, color: 'var(--text-secondary)' }}
          title="Save project to file"
        >
          <Save size={12} /> Save
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[11px] font-semibold transition-all duration-150"
          style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, color: 'var(--text-secondary)' }}
          title="Import project from file"
        >
          <Upload size={12} /> Import
        </button>
        <button
          onClick={() => { setSettingsName(gitIdentity.name); setSettingsEmail(gitIdentity.email); setShowSettings(true); }}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[11px] font-semibold transition-all duration-150"
          style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, color: 'var(--text-secondary)' }}
          title="Git Identity Settings"
        >
          <Settings size={12} /> Settings
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".gitviz.json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {branchLegend.length > 0 && (
        <div className="absolute top-3 right-3 z-10 rounded-md hidden md:block" style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}` }}>
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

      {showRestored && (
        <div
          className="absolute bottom-3 right-3 text-[9px] mono z-10 px-2 py-1 rounded-md"
          style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, color: 'var(--text-muted)', opacity: 0.8 }}
        >
          Restored previous session
        </div>
      )}

      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowSettings(false)}>
          <div className="rounded-lg p-5 w-80" style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
            <div className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Git Identity Settings</div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Name</label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={e => setSettingsName(e.target.value)}
                  placeholder="e.g. Nithinkumar M"
                  className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none"
                  style={{ backgroundColor: isDark ? '#0d1117' : '#f6f8fa', border: `1px solid ${borderColor}`, color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Email</label>
                <input
                  type="email"
                  value={settingsEmail}
                  onChange={e => setSettingsEmail(e.target.value)}
                  placeholder="e.g. nithin@example.com"
                  className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none"
                  style={{ backgroundColor: isDark ? '#0d1117' : '#f6f8fa', border: `1px solid ${borderColor}`, color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowSettings(false)} className="px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleSaveSettings} className="px-3 py-1.5 rounded-md text-[11px] font-semibold text-white" style={{ backgroundColor: '#1f6feb' }}>Save</button>
            </div>
          </div>
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
