# Git Visualizer - Project Context

## Project Location
`C:\Users\nithu\OneDrive\Desktop\opencode project\git-visualizer`

## Tech Stack
- React + TypeScript + Vite
- Tailwind CSS
- Zustand (state management)
- Lucide React (icons)
- Framer Motion (available but not heavily used)
- Web Audio API (sound effects)

## Project Structure
```
src/
├── git/
│   ├── GitRepository.ts      # Core types: Commit, Branch, Remote, Reflog, GitRepositoryState
│   └── commands/
│       └── index.ts           # 21 command implementations (init, add, commit, branch, switch, merge, rebase, reset, revert, fetch, pull, push, stash, cherry-pick, reflog, checkout, create, status, log, diff, remote)
├── components/
│   ├── Terminal.tsx           # Interactive terminal with command history
│   ├── GitGraph.tsx           # Horizontal SVG commit graph with animated arrows
│   ├── RepositoryState.tsx    # Right sidebar: HEAD, branches, remotes, current commit
│   ├── ExplanationPanel.tsx   # Shows command explanation after execution
│   ├── CommandHistory.tsx     # Left sidebar: command history list
│   ├── WorkspacePanel.tsx     # Working directory files with status (new/modified/staged)
│   └── StagingPanel.tsx       # Staged files ready to commit
├── store/
│   └── gitStore.ts            # Zustand store with executeCommand, undo/redo, theme, navigation
├── pages/
│   ├── LandingPage.tsx        # Hero page with animated graph preview
│   ├── GitLabPage.tsx         # Main workspace: terminal, graph, state, explanation
│   ├── MergeRebasePage.tsx    # Interactive merge vs rebase demo
│   ├── CommandExplorerPage.tsx # Searchable command reference
│   ├── TutorialsPage.tsx      # 11 guided lessons
│   ├── ChallengesPage.tsx     # 6 interactive challenges with validation
│   └── AboutPage.tsx          # Git concepts explained
├── utils/
│   └── sounds.ts              # Web Audio API sound effects for each command
├── index.css                  # CSS variables for dark/light theme
├── App.tsx                    # Router between pages
└── main.tsx                   # Entry point
```

## Current Features
1. **Git Simulation Engine** - DAG-based commit graph, branches as references, HEAD tracking
2. **Interactive Terminal** - Execute git commands, command history (arrow keys), Ctrl+K to focus
3. **Horizontal Commit Graph** - SVG with animated flowing arrows and traveling dots
4. **Hover Tooltips** - Show commit ID, message, author, parents, files on node hover
5. **HEAD Pulse Animation** - Pulsing ring on current HEAD position
6. **Workspace Panel** - Shows files with new/modified status indicators
7. **Staging Area Panel** - Shows staged files ready for commit
8. **Theme Toggle** - Dark/Light mode with CSS variables
9. **Sound Effects** - Unique sounds for each command type
10. **Undo/Redo** - State history with undo/redo buttons
11. **Responsive Design** - Desktop multi-panel, mobile tabs

## Supported Commands
- `git init` - Creates repo + auto-creates README.md
- `git add .` / `git add <file>` - Stage files
- `git commit -m "message"` - Create commit
- `git branch <name>` - Create branch
- `git switch <name>` / `git checkout <name>` - Switch branch
- `git merge <branch>` - Merge (fast-forward + 3-way)
- `git rebase <branch>` - Rebase (creates new commits D', E')
- `git status`, `git log`, `git diff` - Info commands
- `git remote add origin <url>` - Add remote
- `git fetch`, `git pull`, `git push` - Remote operations
- `git reset --soft/--mixed/--hard HEAD~1` - Reset
- `git restore <file>` - Restore files
- `git revert HEAD` - Create undo commit
- `git stash` - Stash changes
- `git cherry-pick <commit>` - Apply specific commit
- `git reflog` - Show reference log
- `create <filename>` - Create file in working directory (non-standard, for simulator)

## Sound Effects
- `playInitSound()` - Ascending chime
- `playAddSound()` - Soft click
- `playCommitSound()` - Two-tone chime
- `playBranchSound()` - Quick chirp
- `playSwitchSound()` - Descending tone
- `playMergeSound()` - Rising chord
- `playRebaseSound()` - Triple ascending notes
- `playErrorSound()` - Low buzz
- `playStashSound()` - Descending sweep
- `playResetSound()` - Descending buzz
- `playPushSound()` - Quick ascending beep
- `playGenericSound()` - Simple tone

## Key Implementation Details

### Git Engine (GitRepository.ts)
- Commits are stored in a `Record<string, Commit>` for O(1) lookup
- Each commit has `id`, `parentIds[]`, `message`, `author`, `timestamp`, `files`
- Branches are `{ name, commitId }` references
- HEAD is `{ type: 'branch' | 'commit', value: string }`
- `findCommonAncestor()` uses BFS from both commits
- `cloneState()` uses JSON.parse(JSON.stringify()) for deep clone

### Command Parser (gitStore.ts)
- `parseAndExecute()` splits command string and routes to appropriate function
- Each command function takes state and returns `{ state, output, explanation }`
- Sounds are played after command execution based on command prefix
- Error detection: checks output for 'fatal:', 'error:', 'nothing to commit'

### Graph Layout (GitGraph.tsx)
- Commits sorted by timestamp
- Lane assignment: iterates and assigns to first available lane
- X position: `80 + index * 100` (horizontal layout)
- Y position: `60 + lane * 80` (vertical branching)

## How to Run
```bash
cd "C:\Users\nithu\OneDrive\Desktop\opencode project\git-visualizer"
npm run dev
# Opens at http://localhost:5173 (or next available port)
```

## Build
```bash
npm run build  # Outputs to dist/
```

## Pending/Low Priority
- Conflict simulation (CURRENT vs INCOMING for merge/rebase conflicts)
- Step-through mode for complex operations
- Export/Import state as JSON
- More tutorial lessons
- More challenges
- Tag support (`git tag`)
- File content viewer (click file to see contents)

## Notes
- The `create` command is non-standard (simulator-only) to add files to working directory
- `git init` auto-creates README.md so users can immediately commit
- The graph is horizontal (left-to-right) with branches going top-to-bottom
- Animated arrows flow along edges with traveling dots
- HEAD has a pulsing ring animation

## Branch Ownership Fix (Latest Change)

### Problem
The graph was assigning wrong branch colors to commits. After `git checkout abc` + commits, those commits were colored as `main` because `assignCommitBranches()` propagated backward from branch tips.

### Solution
Added `createdOnBranch: string` to every `Commit`. This field records which branch HEAD was on when the commit was created.

### Key Changes
1. `Commit` interface: added `createdOnBranch` field
2. `createCommit()`: accepts `createdOnBranch` param (default `'main'`)
3. All commit-creating commands pass current branch:
   - `executeCommit` → `currentBranchName`
   - `executeMerge` → target branch
   - `executeRebase` → preserves original branch on replayed commits
   - `executeRevert` → current branch
   - `executeCherryPick` → current branch
4. `assignCommitBranches()` rewritten: uses `createdOnBranch` as primary source
5. Edge coloring: normal edges use child's branch, merge edges use each parent's branch
6. Debug overlay: click any commit node to see `createdOnBranch`, parent, graph branch

### Edge Coloring Rules
- Normal edge (parent → child): colored by child's `createdOnBranch`
- Merge edge (parent → merge commit): colored by that parent's branch
- This correctly represents which branch each commit belongs to
