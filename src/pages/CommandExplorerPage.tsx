import { useState } from 'react';
import { useGitStore } from '../store/gitStore';
import { Search, ChevronRight } from 'lucide-react';
import { Navbar } from '../components/Navbar';

interface CommandInfo {
  name: string;
  category: string;
  description: string;
  example: string;
  explanation: string;
}

const commands: CommandInfo[] = [
  {
    name: 'git init',
    category: 'START',
    description: 'Initialize a new Git repository',
    example: 'git init',
    explanation:
      'Creates a .git directory with the internal structure Git needs to track your project.',
  },
  {
    name: 'git add',
    category: 'BASIC',
    description: 'Stage files for commit',
    example: 'git add .',
    explanation:
      'Moves files from the working directory to the staging area (index). The staging area is a preparation area for your next commit.',
  },
  {
    name: 'git commit',
    category: 'BASIC',
    description: 'Create a new commit',
    example: 'git commit -m "Add feature"',
    explanation:
      'Creates a new commit object containing the staged changes, linked to its parent commit(s).',
  },
  {
    name: 'git status',
    category: 'BASIC',
    description: 'Show working tree status',
    example: 'git status',
    explanation: 'Displays the state of the working directory and staging area.',
  },
  {
    name: 'git branch',
    category: 'BRANCHING',
    description: 'List or create branches',
    example: 'git branch feature',
    explanation:
      'Creates a new branch reference pointing to the current commit. A branch is a movable pointer, not a copy.',
  },
  {
    name: 'git switch',
    category: 'BRANCHING',
    description: 'Switch to a branch',
    example: 'git switch feature',
    explanation: 'Moves HEAD to point to the specified branch.',
  },
  {
    name: 'git checkout',
    category: 'BRANCHING',
    description: 'Switch branches or restore files',
    example: 'git checkout feature',
    explanation:
      'Switches branches or restores working tree files. git switch and git restore are newer, more focused alternatives.',
  },
  {
    name: 'git log',
    category: 'HISTORY',
    description: 'Show commit history',
    example: 'git log',
    explanation: 'Displays the commit history starting from HEAD.',
  },
  {
    name: 'git diff',
    category: 'HISTORY',
    description: 'Show changes',
    example: 'git diff',
    explanation:
      'Shows differences between the working directory and the last commit.',
  },
  {
    name: 'git merge',
    category: 'INTEGRATION',
    description: 'Merge a branch',
    example: 'git merge feature',
    explanation:
      'Integrates changes from another branch. May create a merge commit with two parents, or fast-forward.',
  },
  {
    name: 'git rebase',
    category: 'INTEGRATION',
    description: 'Rebase current branch',
    example: 'git rebase main',
    explanation:
      'Replays commits onto a new base, creating new commits with different IDs. Produces linear history.',
  },
  {
    name: 'git remote',
    category: 'REMOTE',
    description: 'Manage remotes',
    example: 'git remote add origin URL',
    explanation: 'Adds or lists remote repository references.',
  },
  {
    name: 'git fetch',
    category: 'REMOTE',
    description: 'Download from remote',
    example: 'git fetch',
    explanation:
      'Updates remote-tracking branches without changing local branches.',
  },
  {
    name: 'git pull',
    category: 'REMOTE',
    description: 'Fetch and integrate',
    example: 'git pull',
    explanation:
      'Performs fetch + merge (or rebase). Pull = fetch + integration.',
  },
  {
    name: 'git push',
    category: 'REMOTE',
    description: 'Upload to remote',
    example: 'git push',
    explanation: 'Sends local commits to the remote repository.',
  },
  {
    name: 'git reset',
    category: 'UNDO',
    description: 'Reset current HEAD',
    example: 'git reset --hard HEAD~1',
    explanation:
      'Moves the branch pointer and optionally resets staging area and working tree.',
  },
  {
    name: 'git restore',
    category: 'UNDO',
    description: 'Restore working tree files',
    example: 'git restore file.txt',
    explanation:
      'Discards changes in the working directory or staging area.',
  },
  {
    name: 'git revert',
    category: 'UNDO',
    description: 'Create undo commit',
    example: 'git revert HEAD',
    explanation:
      'Creates a NEW commit that reverses the changes from a specified commit.',
  },
  {
    name: 'git stash',
    category: 'ADVANCED',
    description: 'Stash working changes',
    example: 'git stash',
    explanation: 'Temporarily saves uncommitted changes for later use.',
  },
  {
    name: 'git cherry-pick',
    category: 'ADVANCED',
    description: 'Apply a specific commit',
    example: 'git cherry-pick abc1234',
    explanation:
      'Creates a new commit that applies the changes from a specified commit.',
  },
  {
    name: 'git reflog',
    category: 'ADVANCED',
    description: 'Show reference log',
    example: 'git reflog',
    explanation:
      'Shows the history of HEAD movements. Useful for recovering lost commits.',
  },
];

const categories = [
  'START',
  'BASIC',
  'BRANCHING',
  'HISTORY',
  'INTEGRATION',
  'REMOTE',
  'UNDO',
  'ADVANCED',
];

export function CommandExplorerPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<CommandInfo | null>(
    null,
  );

  const executeCommand = useGitStore((state) => state.executeCommand);
  const setCurrentPage = useGitStore((state) => state.setCurrentPage);

  const filtered = commands.filter((cmd) => {
    const matchesSearch =
      cmd.name.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category ? cmd.category === category : true;
    return matchesSearch && matchesCategory;
  });

  const handleTryInLab = (cmd: CommandInfo) => {
    const cmdName = cmd.name.split(' ').slice(1).join(' ');
    executeCommand(cmdName);
    setCurrentPage('lab');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <Navbar />
      <div className="animate-fadeIn" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            color: 'var(--text-primary)',
          }}
        >
          Command Explorer
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Browse and learn Git commands with interactive examples
        </p>

        {/* Search */}
        <div
          style={{
            position: 'relative',
            marginBottom: '1rem',
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search commands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 0.75rem 0.75rem 2.5rem',
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.5rem',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Category Filters */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <button
            onClick={() => setCategory(null)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '9999px',
              border: '1px solid var(--border-color)',
              backgroundColor:
                category === null ? 'var(--accent-blue)' : 'var(--bg-secondary)',
              color: category === null ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.2s',
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '9999px',
                border: '1px solid var(--border-color)',
                backgroundColor:
                  category === cat ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                color: category === cat ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'all 0.2s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: selectedCommand
              ? '1fr 1fr'
              : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {/* Command Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: selectedCommand
                ? '1fr'
                : 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem',
              alignContent: 'start',
            }}
          >
            {filtered.map((cmd) => (
              <div
                key={cmd.name}
                onClick={() => setSelectedCommand(cmd)}
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: `1px solid ${
                    selectedCommand?.name === cmd.name
                      ? 'var(--accent-blue)'
                      : 'var(--border-color)'
                  }`,
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={(e) => {
                  if (selectedCommand?.name !== cmd.name) {
                    e.currentTarget.style.borderColor = 'var(--accent-blue)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCommand?.name !== cmd.name) {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <code
                      style={{
                        fontWeight: 'bold',
                        color: 'var(--accent-blue)',
                        fontSize: '0.95rem',
                      }}
                    >
                      {cmd.name}
                    </code>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {cmd.category}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      margin: 0,
                    }}
                  >
                    {cmd.description}
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                />
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          {selectedCommand && (
            <div
              className="animate-fadeIn"
              style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.75rem',
                alignSelf: 'start',
                position: 'sticky',
                top: '1rem',
              }}
            >
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '0.25rem',
                }}
              >
                {selectedCommand.name}
              </h2>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--accent-blue)',
                  color: '#fff',
                  marginBottom: '1rem',
                }}
              >
                {selectedCommand.category}
              </span>

              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '0.5rem',
                }}
              >
                Description
              </h3>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: '1.5rem',
                }}
              >
                {selectedCommand.description}
              </p>

              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '0.5rem',
                }}
              >
                Example
              </h3>
              <pre
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  color: 'var(--accent-blue)',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  marginBottom: '1.5rem',
                  overflowX: 'auto',
                }}
              >
                {selectedCommand.example}
              </pre>

              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '0.5rem',
                }}
              >
                How It Works
              </h3>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: '1.5rem',
                }}
              >
                {selectedCommand.explanation}
              </p>

              <button
                onClick={() => handleTryInLab(selectedCommand)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'var(--accent-blue)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.85';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Try in Lab
              </button>
            </div>
          )}
        </div>

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem',
              color: 'var(--text-muted)',
            }}
          >
            No commands found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
