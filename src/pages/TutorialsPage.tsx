import { useState, useCallback } from 'react';
import { useGitStore } from '../store/gitStore';
import { Play, CheckCircle, ChevronRight, BookOpen } from 'lucide-react';
import { Navbar } from '../components/Navbar';

interface Tutorial {
  title: string;
  goal: string;
  commands: string[];
  explanation: string;
}

const tutorials: Tutorial[] = [
  { title: 'Your First Repository', goal: 'Initialize a new Git repository and understand what git init does.', commands: ['git init'], explanation: 'git init creates a .git directory containing the internal database Git uses to track your project. Nothing is tracked yet - Git is just ready to start.' },
  { title: 'Your First Commit', goal: 'Stage and commit a file to create your first commit.', commands: ['git init', 'git add README.md', 'git commit -m "Initial commit"'], explanation: 'First we initialize, then stage a file with git add, then create a commit. The commit captures a snapshot of the staged files.' },
  { title: 'Create a Branch', goal: 'Create and switch to a new branch.', commands: ['git init', 'git add .', 'git commit -m "Initial commit"', 'git branch feature', 'git switch feature'], explanation: 'A branch is a movable reference to a commit. Creating a branch does not copy commits - it just creates a new pointer.' },
  { title: 'Merge a Feature', goal: 'Merge a feature branch back into main.', commands: ['git init', 'git add .', 'git commit -m "Initial commit"', 'git branch feature', 'git switch feature', 'git add feature.txt', 'git commit -m "Add feature"', 'git switch main', 'git merge feature'], explanation: 'Merge combines the histories. If main is an ancestor of feature, it fast-forwards. Otherwise, it creates a merge commit with two parents.' },
  { title: 'Rebase a Feature', goal: 'Rebase a feature branch onto main.', commands: ['git init', 'git add .', 'git commit -m "Initial commit"', 'git branch feature', 'git switch feature', 'git add feature.txt', 'git commit -m "Add feature"', 'git switch main', 'git add main.txt', 'git commit -m "Update main"', 'git switch feature', 'git rebase main'], explanation: 'Rebase replays commits onto a new base. It creates new commits (D prime, E prime) with different IDs. The history becomes linear.' },
  { title: 'Merge vs Rebase', goal: 'Compare merge and rebase side by side.', commands: ['git init', 'git add .', 'git commit -m "Initial commit"', 'git branch feature', 'git switch feature', 'git add feature.txt', 'git commit -m "Add feature"', 'git switch main', 'git add main.txt', 'git commit -m "Update main"', 'git switch feature', 'git rebase main'], explanation: 'Try both approaches: merge creates a merge commit with two parents, rebase creates rewritten commits with new IDs. See the Merge vs Rebase page for a visual comparison.' },
  { title: 'Push to Remote', goal: 'Set up a remote and push commits.', commands: ['git init', 'git add .', 'git commit -m "Initial commit"', 'git remote add origin https://github.com/user/repo.git', 'git push'], explanation: 'git push sends your local commits to the remote repository. The remote branch (origin/main) is updated to point to your latest commit.' },
  { title: 'Fetch vs Pull', goal: 'Understand the difference between fetch and pull.', commands: ['git init', 'git add .', 'git commit -m "Initial commit"', 'git remote add origin https://github.com/user/repo.git', 'git fetch'], explanation: 'fetch updates remote-tracking branches without changing your local branches. pull = fetch + merge. fetch is safer because you can review changes before integrating.' },
  { title: 'Reset vs Revert', goal: 'Understand the difference between reset and revert.', commands: ['git init', 'git add .', 'git commit -m "First commit"', 'git add file.txt', 'git commit -m "Second commit"', 'git reset --soft HEAD~1'], explanation: 'reset moves the branch pointer backward. revert creates a new commit that undoes changes. reset can lose work; revert is always safe.' },
  { title: 'Detached HEAD', goal: 'Understand what happens when HEAD points directly to a commit.', commands: ['git init', 'git add .', 'git commit -m "Initial commit"', 'git add file2.txt', 'git commit -m "Second commit"', 'git switch --detach HEAD~1'], explanation: 'Detached HEAD means HEAD points directly to a commit instead of a branch. Any new commits will not be on any branch.' },
  { title: 'Recover with Reflog', goal: 'Use reflog to understand how to recover lost commits.', commands: ['git init', 'git add .', 'git commit -m "Initial commit"', 'git add file.txt', 'git commit -m "Important commit"', 'git reset --hard HEAD~1', 'git reflog'], explanation: 'The reflog records every time HEAD moves. Even after reset --hard, the old commit still exists and can be recovered via reflog.' },
];

export function TutorialsPage() {
  const { setCurrentPage, executeCommand, resetSimulation } = useGitStore();
  const [selectedTutorial, setSelectedTutorial] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const handleStart = useCallback((index: number) => {
    resetSimulation();
    setSelectedTutorial(index);
    setCurrentStep(0);
  }, [resetSimulation]);

  const handleStep = useCallback(() => {
    if (selectedTutorial === null) return;
    const tutorial = tutorials[selectedTutorial];
    if (currentStep < tutorial.commands.length) {
      executeCommand(tutorial.commands[currentStep]);
      setCurrentStep((s) => s + 1);
    } else {
      setCompleted((prev) => new Set([...prev, selectedTutorial]));
    }
  }, [selectedTutorial, currentStep, executeCommand]);

  const handleRunAll = useCallback(() => {
    if (selectedTutorial === null) return;
    const tutorial = tutorials[selectedTutorial];
    resetSimulation();
    tutorial.commands.forEach((cmd) => executeCommand(cmd));
    setCurrentStep(tutorial.commands.length);
    setCompleted((prev) => new Set([...prev, selectedTutorial]));
  }, [selectedTutorial, executeCommand, resetSimulation]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-12 animate-fadeIn">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen size={28} style={{ color: 'var(--accent-blue)' }} />
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Tutorials</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Guided lessons to learn Git step by step.</p>
          </div>
        </div>

        {selectedTutorial === null ? (
          <div className="grid gap-3">
            {tutorials.map((tutorial, i) => (
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
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tutorial.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{tutorial.goal}</p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <button onClick={() => { setSelectedTutorial(null); resetSimulation(); }} className="text-sm font-medium" style={{ color: 'var(--accent-blue)' }}>
              &larr; Back to tutorials
            </button>

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{tutorials[selectedTutorial].title}</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{tutorials[selectedTutorial].goal}</p>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>COMMANDS ({currentStep}/{tutorials[selectedTutorial].commands.length})</h4>
                  <div className="space-y-1">
                    {tutorials[selectedTutorial].commands.map((cmd, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs"
                        style={{
                          backgroundColor: i < currentStep ? 'var(--accent-green-bg)' : i === currentStep ? 'var(--accent-blue-bg)' : 'transparent',
                          color: i < currentStep ? 'var(--accent-green)' : i === currentStep ? 'var(--accent-blue)' : 'var(--text-muted)',
                          border: i === currentStep ? '1px solid rgba(88,166,255,0.3)' : '1px solid transparent',
                        }}
                      >
                        <span className="w-4">{i < currentStep ? '\u2713' : i === currentStep ? '\u2192' : '\u00b7'}</span>
                        <code>{cmd}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  {currentStep < tutorials[selectedTutorial].commands.length ? (
                    <button onClick={handleStep} className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: 'var(--accent-green)' }}>
                      <Play size={14} /> Step
                    </button>
                  ) : null}
                  <button onClick={handleRunAll} className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: 'var(--accent-blue)' }}>
                    Run All
                  </button>
                </div>

                <div className="rounded-xl p-4" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                  <h4 className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>EXPLANATION</h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{tutorials[selectedTutorial].explanation}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentPage('lab')}
              className="w-full py-3 font-semibold rounded-xl transition-all duration-200 text-sm hover:scale-[1.01]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              Open in Lab &rarr;
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
