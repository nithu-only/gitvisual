import { useState, useCallback } from 'react';
import { useGitStore } from '../store/gitStore';
import { CheckCircle, XCircle, Trophy, Target } from 'lucide-react';
import { Navbar } from '../components/Navbar';

interface Challenge {
  title: string;
  description: string;
  startingCommands: string[];
  solution: string[];
  validate: (state: any) => boolean;
  hint: string;
}

const challenges: Challenge[] = [
  { title: 'Create Your First Branch', description: 'Initialize a repository and create a branch called "develop".', startingCommands: ['git init'], solution: ['git branch develop'], validate: (state) => state.initialized && state.branches.some((b: any) => b.name === 'develop'), hint: 'Use: git branch <name>' },
  { title: 'Fast-Forward Merge', description: 'Create a feature branch, add a commit, then fast-forward merge it into main.', startingCommands: ['git init', 'git add .', 'git commit -m "Initial commit"', 'git branch feature', 'git switch feature', 'create feature.txt', 'git add feature.txt', 'git commit -m "Add feature"'], solution: ['git switch main', 'git merge feature'], validate: (state) => { const main = state.branches.find((b: any) => b.name === 'main'); const feature = state.branches.find((b: any) => b.name === 'feature'); if (!main || !feature) return false; if (main.commitId === feature.commitId) return false; const featureCommit = state.commits[feature.commitId]; return featureCommit && featureCommit.parentIds.length === 1 && state.commits[featureCommit.parentIds[0]]?.message === 'Initial commit'; }, hint: 'Switch to main first, then merge feature.' },
  { title: 'Three-Way Merge', description: 'Create a diverged history and perform a merge that creates a merge commit.', startingCommands: ['git init', 'git add .', 'git commit -m "Initial commit"', 'git branch feature', 'git switch feature', 'create feature.txt', 'git add feature.txt', 'git commit -m "Feature work"', 'git switch main', 'create main.txt', 'git add main.txt', 'git commit -m "Main work"'], solution: ['git merge feature'], validate: (state) => { const main = state.branches.find((b: any) => b.name === 'main'); if (!main) return false; const commit = state.commits[main.commitId]; return commit && commit.parentIds.length === 2; }, hint: 'Switch to main, then merge feature.' },
  { title: 'Rebase Feature onto Main', description: 'Rebase a feature branch onto main to linearize the history.', startingCommands: ['git init', 'git add .', 'git commit -m "Initial commit"', 'git branch feature', 'git switch feature', 'create feature.txt', 'git add feature.txt', 'git commit -m "Feature work"', 'git switch main', 'create main.txt', 'git add main.txt', 'git commit -m "Main work"', 'git switch feature'], solution: ['git rebase main'], validate: (state) => { const feature = state.branches.find((b: any) => b.name === 'feature'); const main = state.branches.find((b: any) => b.name === 'main'); if (!feature || !main) return false; const commit = state.commits[feature.commitId]; return commit && commit.parentIds.length === 1 && commit.parentIds[0] === main.commitId; }, hint: 'Make sure you are on the feature branch.' },
  { title: 'Soft Reset', description: 'Undo the last commit but keep changes staged.', startingCommands: ['git init', 'git add .', 'git commit -m "First commit"', 'create file.txt', 'git add file.txt', 'git commit -m "Second commit"'], solution: ['git reset --soft HEAD~1'], validate: (state) => { const main = state.branches.find((b: any) => b.name === 'main'); if (!main) return false; const commit = state.commits[main.commitId]; return commit && commit.message === 'First commit' && Object.keys(state.stagingArea).length > 0; }, hint: 'Use: git reset --soft HEAD~1' },
  { title: 'Revert a Commit', description: 'Revert the last commit by creating an undo commit.', startingCommands: ['git init', 'git add .', 'git commit -m "Initial commit"', 'create bad-file.txt', 'git add bad-file.txt', 'git commit -m "Bad commit"'], solution: ['git revert HEAD'], validate: (state) => { const main = state.branches.find((b: any) => b.name === 'main'); if (!main) return false; const commit = state.commits[main.commitId]; return commit && commit.message.includes('Revert'); }, hint: 'Use: git revert HEAD' },
];

export function ChallengesPage() {
  const { executeCommand, resetSimulation } = useGitStore();
  const [selectedChallenge, setSelectedChallenge] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<'success' | 'fail' | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handleStart = useCallback((index: number) => {
    resetSimulation(false, false);
    const challenge = challenges[index];
    challenge.startingCommands.forEach((cmd) => executeCommand(cmd));
    setSelectedChallenge(index);
    setResult(null);
    setShowHint(false);
  }, [resetSimulation, executeCommand]);

  const handleSubmit = useCallback((command: string) => {
    if (selectedChallenge === null) return;
    executeCommand(command);
    const challenge = challenges[selectedChallenge];
    setTimeout(() => {
      const state = useGitStore.getState().gitState;
      if (challenge.validate(state)) {
        setResult('success');
        setCompleted((prev) => new Set([...prev, selectedChallenge]));
      } else {
        setResult('fail');
      }
    }, 100);
  }, [selectedChallenge, executeCommand]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-12 animate-fadeIn">
        <div className="flex items-center gap-3 mb-8">
          <Trophy size={28} style={{ color: 'var(--accent-yellow)' }} />
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Challenge Mode</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Test your Git knowledge with interactive challenges.</p>
          </div>
        </div>

        {selectedChallenge === null ? (
          <div className="grid gap-3">
            {challenges.map((challenge, i) => (
              <button
                key={i}
                onClick={() => handleStart(i)}
                className="text-left rounded-xl p-4 transition-all duration-200 flex items-center gap-4 hover:scale-[1.01]"
                style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  {completed.has(i) ? (
                    <CheckCircle size={16} style={{ color: 'var(--accent-green)' }} />
                  ) : (
                    <Target size={14} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{challenge.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{challenge.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <button onClick={() => { setSelectedChallenge(null); resetSimulation(false, false); }} className="text-sm font-medium" style={{ color: 'var(--accent-blue)' }}>
              &larr; Back to challenges
            </button>

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{challenges[selectedChallenge].title}</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{challenges[selectedChallenge].description}</p>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>STARTING STATE (already executed)</h4>
                  <div className="space-y-1">
                    {challenges[selectedChallenge].startingCommands.map((cmd, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1 rounded-lg font-mono text-xs" style={{ backgroundColor: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>
                        <span>&#x2713;</span> <code>{cmd}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                  <h4 className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>YOUR COMMAND</h4>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const input = formData.get('command') as string;
                      if (input) handleSubmit(input);
                      e.currentTarget.reset();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      name="command"
                      type="text"
                      className="flex-1 px-3 py-2 rounded-lg font-mono text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      placeholder="Type your git command..."
                    />
                    <button type="submit" className="px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: 'var(--accent-green)' }}>
                      Submit
                    </button>
                  </form>
                </div>

                {result === 'success' && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl animate-fadeIn" style={{ backgroundColor: 'var(--accent-green-bg)', border: '1px solid rgba(63,185,80,0.3)' }}>
                    <CheckCircle size={18} style={{ color: 'var(--accent-green)' }} />
                    <span className="font-semibold text-sm" style={{ color: 'var(--accent-green)' }}>Challenge Complete!</span>
                  </div>
                )}

                {result === 'fail' && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl animate-fadeIn" style={{ backgroundColor: 'var(--accent-red-bg)', border: '1px solid rgba(248,81,73,0.3)' }}>
                    <XCircle size={18} style={{ color: 'var(--accent-red)' }} />
                    <span className="text-sm" style={{ color: 'var(--accent-red)' }}>Not quite. Check the state and try again.</span>
                  </div>
                )}

                <button onClick={() => setShowHint(!showHint)} className="text-xs font-medium" style={{ color: 'var(--accent-blue)' }}>
                  {showHint ? 'Hide hint' : 'Show hint'}
                </button>

                {showHint && (
                  <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--accent-blue-bg)', border: '1px solid rgba(88,166,255,0.2)', color: 'var(--text-secondary)' }}>
                    {challenges[selectedChallenge].hint}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
