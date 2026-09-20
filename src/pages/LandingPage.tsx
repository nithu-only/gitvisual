import { useGitStore } from '../store/gitStore';
import { GitBranch, Play, GitMerge, BookOpen, Layers, Terminal } from 'lucide-react';
import { Navbar } from '../components/Navbar';

export function LandingPage() {
  const { setCurrentPage, theme } = useGitStore();
  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center animate-fadeIn">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            GIT VISUALIZER
          </h1>
          <p className="text-xl md:text-2xl mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Stop memorizing Git commands.<br />
            <span style={{ color: 'var(--accent-blue)' }}>Start seeing what Git does.</span>
          </p>
          <p className="text-base mb-12 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            An interactive Git playground that shows commits, branches, HEAD, staging, merge, rebase, fetch, pull and push as they happen.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => setCurrentPage('lab')}
              className="flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-white"
              style={{ backgroundColor: 'var(--accent-green)' }}
            >
              <Play size={18} /> START VISUALIZING
            </button>
            <button
              onClick={() => setCurrentPage('merge-rebase')}
              className="flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-white"
              style={{ backgroundColor: 'var(--accent-blue)' }}
            >
              <GitMerge size={18} /> TRY MERGE VS REBASE
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { icon: Terminal, label: 'Interactive Terminal' },
              { icon: GitBranch, label: 'Live Commit Graph' },
              { icon: Layers, label: 'Workspace & Staging' },
              { icon: BookOpen, label: 'Guided Tutorials' },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 hover:scale-[1.03]"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <feature.icon size={20} style={{ color: 'var(--accent-blue)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{feature.label}</span>
              </div>
            ))}
          </div>

          <div
            className="relative mx-auto max-w-md rounded-xl p-6"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <svg width="320" height="120" viewBox="0 0 320 120" className="mx-auto">
              <line x1="40" y1="40" x2="120" y2="40" stroke={isDark ? '#30363d' : '#d8dee4'} strokeWidth="2" />
              <line x1="120" y1="40" x2="200" y2="40" stroke={isDark ? '#30363d' : '#d8dee4'} strokeWidth="2" />
              <line x1="120" y1="40" x2="200" y2="90" stroke={isDark ? '#30363d' : '#d8dee4'} strokeWidth="2" />
              <line x1="200" y1="40" x2="280" y2="40" stroke={isDark ? '#30363d' : '#d8dee4'} strokeWidth="2" />
              <line x1="200" y1="90" x2="280" y2="90" stroke={isDark ? '#30363d' : '#d8dee4'} strokeWidth="2" />
              {[{ cx: 40, cy: 40 }, { cx: 120, cy: 40 }, { cx: 200, cy: 40 }, { cx: 200, cy: 90 }, { cx: 280, cy: 40 }, { cx: 280, cy: 90 }].map((pos, i) => (
                <circle key={i} cx={pos.cx} cy={pos.cy} r="6" fill="var(--accent-green)" opacity="0.8">
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                </circle>
              ))}
              <circle cx="280" cy="40" r="8" fill="var(--accent-blue)">
                <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <text x="40" y="28" fill="var(--text-muted)" fontSize="9" fontFamily="monospace">A</text>
              <text x="120" y="28" fill="var(--text-muted)" fontSize="9" fontFamily="monospace">B</text>
              <text x="200" y="28" fill="var(--text-muted)" fontSize="9" fontFamily="monospace">C</text>
              <text x="200" y="108" fill="var(--text-muted)" fontSize="9" fontFamily="monospace">D</text>
              <text x="280" y="28" fill="var(--text-muted)" fontSize="9" fontFamily="monospace">E</text>
              <text x="280" y="108" fill="var(--text-muted)" fontSize="9" fontFamily="monospace">F</text>
              <text x="300" y="44" fill="var(--accent-blue)" fontSize="8" fontFamily="monospace">main</text>
              <text x="300" y="94" fill="var(--accent-green)" fontSize="8" fontFamily="monospace">feature</text>
            </svg>
            <p className="text-xs mt-4 font-mono" style={{ color: 'var(--text-muted)' }}>Interactive commit graph visualization</p>
          </div>
        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center text-xs" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
        Git Visualizer — An interactive laboratory for understanding Git history
      </footer>
    </div>
  );
}
