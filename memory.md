# Git Visualizer - Project Context

## Project Location
`C:\Users\nithu\OneDrive\Desktop\opencode project\git-visualizer`

## Tech Stack
- React + TypeScript + Vite
- Tailwind CSS v4
- Zustand (state management)
- Lucide React (icons)
- @xyflow/react (React Flow - graph canvas)
- elkjs (ELK - automatic DAG layout)
- Web Audio API (sound effects)

## Project Structure
```
src/
├── git/
│   ├── GitRepository.ts      # Core types: Commit, Branch, Remote, Reflog, GitRepositoryState
│   └── commands/
│       └── index.ts           # 21 command implementations
├── graph/
│   ├── types.ts               # CommitNode, CommitEdge, GraphLayoutState
│   ├── branchColors.ts        # Deterministic branch color palette
│   ├── gitToGraph.ts          # GitState → React Flow nodes/edges adapter
│   ├── layoutEngine.ts        # ELK-based Git-aware layout
│   └── CommitNode.tsx         # Custom React Flow node component
├── components/
│   ├── Terminal.tsx           # Interactive terminal
│   ├── GitGraph.tsx           # React Flow canvas with controls
│   ├── RepositoryState.tsx    # Right sidebar: HEAD, branches, remotes
│   ├── ExplanationPanel.tsx   # Command explanations
│   ├── CommandHistory.tsx     # Left sidebar: command history
│   ├── WorkspacePanel.tsx     # Working directory files
│   ├── StagingPanel.tsx       # Staged files
│   ├── ThemeToggle.tsx        # Sun/Moon toggle
│   └── Navbar.tsx             # Shared navigation
├── store/
│   └── gitStore.ts            # Zustand store
├── pages/
│   ├── LandingPage.tsx        # Hero page
│   ├── GitLabPage.tsx         # Main workspace
│   ├── MergeRebasePage.tsx    # Merge vs Rebase demo
│   ├── CommandExplorerPage.tsx # Command reference
│   ├── TutorialsPage.tsx      # Guided lessons
│   ├── ChallengesPage.tsx     # Interactive challenges
│   └── AboutPage.tsx          # Git concepts
├── utils/
│   └── sounds.ts              # Web Audio API sound effects
├── index.css                  # CSS variables for dark/light theme
├── App.tsx                    # Router between pages
└── main.tsx                   # Entry point
```

## Current Features

### Git Simulation Engine
- DAG-based commit graph
- Branches as references
- HEAD tracking
- Reflog
- 21 commands: init, add, commit, branch, switch, merge, rebase, push, pull, fetch, status, log, diff, reset, restore, revert, stash, cherry-pick, reflog, checkout, create

### Graph Visualization
- React Flow canvas with pan/zoom/drag
- ELK.js automatic DAG layout
- Branch-colored edges (deterministic palette)
- Branch creation annotations
- Branch lane constraints
- Merge visualization with colored parent edges
- MiniMap
- Manual node dragging (preserves Git state)
- Auto Layout / Reset / Fit View controls

### UI Components
- Interactive terminal with command history
- Command history timeline
- Repository state panel (HEAD, branches, staging, working tree)
- Explanation panel (What Happened, Under the Hood)
- Theme toggle (dark/light)
- Responsive layout (desktop 3-column, mobile tabs)

## Key Architecture

### Data Flow
```
Git Engine → GitState → gitStateToGraph() → React Flow → ELK Layout
```

### Branch Color System
- Deterministic palette (15 colors)
- Same branch always gets same color
- `main` always blue
- Colors used for: edges, branch labels, node borders, annotations

### Layout Engine
- Computes topological layers (longest path from root)
- Assigns branch lanes
- ELK layered layout with Git-aware constraints
- Post-layout branch lane repositioning

### Edge Coloring Rules
- Non-merge edges: use child commit's `createdOnBranch` color (the branch HEAD was on when the commit was created)
- Merge edges: each parent edge uses that parent's branch color (visually distinct incoming edges)
- Remote edges: dashed stroke

### Branch Ownership (createdOnBranch)
- Every `Commit` has a `createdOnBranch: string` field
- Set at commit creation time to the current branch HEAD was pointing to
- Used as the PRIMARY source for branch assignment in `assignCommitBranches()`
- Fallback chain: `createdOnBranch` → branch tips → parent inheritance → `'main'`
- This fixes the critical bug where commits on a non-main branch were incorrectly colored as main
- All commit-creating commands (commit, merge, rebase, revert, cherry-pick) set this field

## Supported Commands
```bash
git init                    # Create repository
git add . / git add <file>  # Stage files
git commit -m "message"     # Create commit
git branch <name>           # Create branch
git switch <name>           # Switch branch
git merge <branch>          # Merge branch
git rebase <branch>         # Rebase onto branch
git status                  # Show status
git log                     # Show history
git diff                    # Show changes
git remote add origin <url> # Add remote
git fetch                   # Fetch from remote
git pull                    # Pull from remote
git push                    # Push to remote
git reset --soft/--mixed/--hard HEAD~1  # Reset
git restore <file>          # Restore file
git revert HEAD             # Create undo commit
git stash                   # Stash changes
git cherry-pick <commit>    # Apply specific commit
git reflog                  # Show reference log
create <filename>           # Create file (simulator-only)
```

## How to Run
```bash
cd "C:\Users\nithu\OneDrive\Desktop\opencode project\git-visualizer"
npm install
npm run dev
# Opens at http://localhost:5173
```

## Build
```bash
npm run build  # Outputs to dist/
```

## Recent Changes

### Branch Ownership Fix (Latest)
1. Added `createdOnBranch: string` to `Commit` interface in `GitRepository.ts`
2. `createCommit()` now accepts `createdOnBranch` parameter (defaults to `'main'`)
3. `executeCommit` passes `currentBranchName` when creating commits
4. `executeMerge` sets `createdOnBranch` to the target branch
5. `executeRebase` preserves branch identity on replayed commits
6. `executeRevert` and `executeCherryPick` set `createdOnBranch` to current branch
7. `assignCommitBranches()` in `gitToGraph.ts` rewritten to use `createdOnBranch` as primary source
8. Edge coloring: normal edges use child's branch, merge edges use each parent's branch
9. Added debug overlay on CommitNode (click to inspect `createdOnBranch`, parent, graph branch)
10. Fixed pre-existing unused variable build errors (Tag, nextColorIndex, isRemote, edges, maxLayer, workingFiles, stagedFiles)

### Earlier Changes (Production Launch Prep)
1. Added `branchCreationPoints` to GitRepositoryState
2. Branch command now tracks creation points
3. Layout engine rewritten with Git-aware layout
4. Branch creation annotations on graph
5. Branch lane constraints for consistent positioning
6. Better merge visualization with colored parent edges
7. UI redesign with compact panels and consistent styling
