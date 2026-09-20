import { GitBranch, BookOpen, Code, Layers, Zap, Shield } from 'lucide-react';
import { Navbar } from '../components/Navbar';

const concepts = [
  {
    icon: Layers,
    title: 'Commits are Snapshots',
    description:
      'Each commit captures a complete snapshot of your project at a point in time. Commits form a Directed Acyclic Graph (DAG) - each commit can have one or more parents.',
  },
  {
    icon: GitBranch,
    title: 'Branches are References',
    description:
      'A branch is simply a movable pointer to a commit. Creating a branch does NOT copy commits. It just creates a new reference that can be updated as you make new commits.',
  },
  {
    icon: Code,
    title: 'HEAD Points to Where You Are',
    description:
      'HEAD normally points to the current branch, which in turn points to a commit. In detached HEAD state, HEAD points directly to a commit instead of a branch.',
  },
  {
    icon: Zap,
    title: 'Merge Creates a Merge Commit',
    description:
      'When you merge branches that have diverged, Git creates a new commit with two (or more) parents. This preserves the branching history. Fast-forward merge simply moves the branch pointer forward.',
  },
  {
    icon: Shield,
    title: 'Rebase Rewrites History',
    description:
      'Rebase replays commits onto a new base, creating new commits with different IDs. This produces a linear history but rewrites commit ancestry. Never rebase commits that have been shared with others.',
  },
  {
    icon: BookOpen,
    title: 'The Three Areas',
    description:
      'Git has three main areas: the Working Directory (your files), the Staging Area (index, preparation for commit), and the Repository (where commits are stored). Understanding these areas is key to mastering Git.',
  },
];

export function AboutPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-12 animate-fadeIn">
        <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
          About Git Concepts
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {concepts.map((concept) => {
            const Icon = concept.icon;
            return (
              <div
                key={concept.title}
                className="rounded-xl p-6"
                style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Icon size={20} style={{ color: 'var(--accent-blue)' }} />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {concept.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {concept.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl p-8" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            How This Works
          </h2>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Git Visualizer contains a custom Git simulation engine built in TypeScript. When you type a command in the terminal, it is parsed and executed against an internal repository state model. The model tracks commits as a DAG (Directed Acyclic Graph), branches as references, HEAD position, staging area, working tree, and remote-tracking branches.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The commit graph visualization is rendered directly from this state - there are no fake or disconnected visualizations. Every commit, branch, and HEAD position you see is derived from the actual simulation.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              This approach ensures that what you learn in the visualizer accurately represents how Git actually works internally.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
