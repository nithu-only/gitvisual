import { useState } from 'react';
import { useGitStore } from '../store/gitStore';
import { generateCommitId } from '../git/GitRepository';
import { GitMerge, ArrowRight, RotateCcw } from 'lucide-react';
import { Navbar } from '../components/Navbar';

interface DemoState {
  commits: Record<string, { id: string; parentIds: string[]; message: string; label: string }>;
  branches: { name: string; commitId: string }[];
  HEAD: { type: 'branch' | 'commit'; value: string };
}

function createInitialDemoState(): DemoState {
  const a = generateCommitId();
  const b = generateCommitId();
  const c = generateCommitId();
  const d = generateCommitId();
  const e = generateCommitId();
  return {
    commits: {
      [a]: { id: a, parentIds: [], message: 'Initial commit', label: 'A' },
      [b]: { id: b, parentIds: [a], message: 'Add feature base', label: 'B' },
      [c]: { id: c, parentIds: [b], message: 'Update main', label: 'C' },
      [d]: { id: d, parentIds: [b], message: 'Add feature work', label: 'D' },
      [e]: { id: e, parentIds: [d], message: 'Complete feature', label: 'E' },
    },
    branches: [{ name: 'main', commitId: c }, { name: 'feature', commitId: e }],
    HEAD: { type: 'branch', value: 'main' },
  };
}

function performMerge(state: DemoState): DemoState {
  const mainBranch = state.branches.find(b => b.name === 'main')!;
  const featureBranch = state.branches.find(b => b.name === 'feature')!;
  const m = generateCommitId();
  return { ...state, commits: { ...state.commits, [m]: { id: m, parentIds: [mainBranch.commitId, featureBranch.commitId], message: "Merge branch 'feature' into main", label: 'M' } }, branches: state.branches.map(b => b.name === 'main' ? { ...b, commitId: m } : b) };
}

function performRebase(state: DemoState): DemoState {
  const mainBranch = state.branches.find(b => b.name === 'main')!;
  const d2 = generateCommitId();
  const e2 = generateCommitId();
  return { ...state, commits: { ...state.commits, [d2]: { id: d2, parentIds: [mainBranch.commitId], message: 'Add feature work', label: "D'" }, [e2]: { id: e2, parentIds: [d2], message: 'Complete feature', label: "E'" } }, branches: state.branches.map(b => b.name === 'feature' ? { ...b, commitId: e2 } : b) };
}

function DemoGraph({ state, title }: { state: DemoState; title: string }) {
  const { theme } = useGitStore();
  const isDark = theme === 'dark';
  const sorted = Object.values(state.commits);
  const positions = sorted.map((c, i) => ({ ...c, x: 60 + i * 60, y: 30 + (c.label === 'A' || c.label === 'B' || c.label === 'C' || c.label === 'M' ? 0 : 1) * 60 }));
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
      <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{title}</span>
      </div>
      <div className="p-4 overflow-x-auto">
        <svg width={sorted.length * 60 + 80} height="140" className="min-w-[250px]">
          {positions.map((node) => node.parentIds.map(parentId => { const parent = positions.find(p => p.id === parentId); return parent ? <line key={`${node.id}-${parentId}`} x1={node.x} y1={node.y} x2={parent.x} y2={parent.y} stroke={isDark ? '#30363d' : '#d8dee4'} strokeWidth="2" /> : null; }))}
          {positions.map((node) => (<g key={node.id}><circle cx={node.x} cy={node.y} r="10" fill={node.label === 'M' ? 'var(--accent-blue)' : node.label.includes("'") ? 'var(--accent-yellow)' : 'var(--accent-green)'} /><text x={node.x} y={node.y + 4} fill="white" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">{node.label}</text></g>))}
          {state.branches.map((b) => { const commit = positions.find(p => p.id === b.commitId); return commit ? <g key={b.name}><rect x={commit.x - 15} y={commit.y + 14} width={b.name.length * 7 + 10} height="16" rx="3" fill={b.name === 'main' ? 'var(--accent-blue)' : 'var(--accent-green)'} /><text x={commit.x} y={commit.y + 26} fill="white" fontSize="9" fontFamily="monospace" textAnchor="middle">{b.name}</text></g> : null; })}
        </svg>
      </div>
    </div>
  );
}

export function MergeRebasePage() {
  const [initialState] = useState(createInitialDemoState);
  const [mergeResult, setMergeResult] = useState<DemoState | null>(null);
  const [rebaseResult, setRebaseResult] = useState<DemoState | null>(null);
  const [activeDemo, setActiveDemo] = useState<'merge' | 'rebase' | null>(null);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-12 animate-fadeIn">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center" style={{ color: 'var(--text-primary)' }}>Merge vs Rebase</h1>
        <p className="text-center mb-10 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>See the fundamental difference between merge and rebase.</p>
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Starting State</h2>
          <DemoGraph state={initialState} title="A---B---C main | B---D---E feature" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <button onClick={() => { setMergeResult(performMerge(initialState)); setActiveDemo('merge'); }} disabled={activeDemo === 'merge'} className="flex items-center justify-center gap-2 px-6 py-3 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: 'var(--accent-green)' }}><GitMerge size={18} /> MERGE</button>
          <button onClick={() => { setRebaseResult(performRebase(initialState)); setActiveDemo('rebase'); }} disabled={activeDemo === 'rebase'} className="flex items-center justify-center gap-2 px-6 py-3 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: 'var(--accent-yellow)' }}><ArrowRight size={18} /> REBASE</button>
          <button onClick={() => { setMergeResult(null); setRebaseResult(null); setActiveDemo(null); }} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}><RotateCcw size={18} /> RESET</button>
        </div>
        {activeDemo === 'merge' && mergeResult && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--accent-green)' }}>Merge Result</h2>
            <DemoGraph state={mergeResult} title="Merge commit M with two parents" />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl p-5" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--accent-green)' }}>What Happened</h3>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Git created a new merge commit <span className="font-mono" style={{ color: 'var(--accent-blue)' }}>M</span> with <span className="font-semibold">two parents</span>.</p>
              </div>
              <div className="rounded-xl p-5" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--accent-green)' }}>Key Properties</h3>
                <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <li>• Existing commits unchanged</li>
                  <li>• Preserves branching history</li>
                  <li>• Non-linear graph</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        {activeDemo === 'rebase' && rebaseResult && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--accent-yellow)' }}>Rebase Result</h2>
            <DemoGraph state={rebaseResult} title="A---B---C---D'---E' (linearized)" />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl p-5" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--accent-yellow)' }}>What Happened</h3>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Git <span className="font-semibold">replayed</span> commits creating <span className="font-mono" style={{ color: 'var(--accent-yellow)' }}>D'</span> and <span className="font-mono" style={{ color: 'var(--accent-yellow)' }}>E'</span>.</p>
              </div>
              <div className="rounded-xl p-5" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--accent-yellow)' }}>Key Properties</h3>
                <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <li>• New commits with different IDs</li>
                  <li>• Linear history</li>
                  <li>• Rewrites commit ancestry</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        <div className="mt-12 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
          <div className="px-5 py-3 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Tradeoffs</h3>
          </div>
          <div className="grid md:grid-cols-2">
            <div className="p-5 border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--border-color)' }}>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--accent-green)' }}>Merge</h4>
              <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>✓ Preserves existing commits</li>
                <li>✓ Preserves branching history</li>
                <li>✓ Non-destructive</li>
              </ul>
            </div>
            <div className="p-5">
              <h4 className="font-semibold mb-2" style={{ color: 'var(--accent-yellow)' }}>Rebase</h4>
              <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>✓ Produces linear history</li>
                <li>✓ Easier to read</li>
                <li>✗ Creates new commits</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
