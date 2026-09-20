# Git Visualizer

An interactive web application that teaches Git by visualizing commands in real-time. See what Git actually does when you run commands like `commit`, `branch`, `merge`, and `rebase`.

## Features

### Interactive Git Simulator
- Execute real Git commands in a built-in terminal
- Full DAG-based commit graph with branch tracking
- HEAD, staging area, working tree visualization
- 21 supported commands including merge, rebase, push, pull, and more

### Visual Graph
- **Branch-colored edges** — each branch has its own consistent color
- **Git lane-based layout** — pure deterministic layout engine places main on primary lane with feature branches alternating above/below
- **Smart handle routing** — edges automatically select optimal source/target handles based on node positions
- **Merge-edge crossing avoidance** — second pass optimizes merge edge handles to minimize visual crossings
- **Branch creation annotations** — see exactly where branches were created
- **Edge particle animation** — subtle traveling dots continuously move along every edge, following exact rendered paths
- **Commit animation** — brief traveling glow on newly created commit edges
- **Manual dragging** — reposition nodes without affecting Git state
- **Pan, zoom, and minimap** — navigate large histories easily
- **Session persistence** — graph positions and state survive page refresh

### Learning Tools
- **Command history** — see all commands you've executed
- **Explanations** — understand what each command did and why
- **Repository state** — view HEAD, branches, staging area, and working tree
- **Dark/Light theme** — comfortable viewing in any environment
- **Sound effects** — unique audio feedback for each command type

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
cd git-visualizer
npm install
```

### Development

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173)

### Production Build

```bash
npm run build
```

Outputs to `dist/` directory.

## Usage

### Basic Workflow

1. **Initialize a repository**
   ```
   git init
   ```

2. **Create and stage files**
   ```
   create index.html
   git add .
   ```

3. **Make commits**
   ```
   git commit -m "initial commit"
   ```

4. **Create branches**
   ```
   git branch feature
   git switch feature
   ```

5. **Work on branches**
   ```
   git commit -m "add login page"
   ```

6. **Merge branches**
   ```
   git switch main
   git merge feature
   ```

### Supported Commands

| Command | Description |
|---------|-------------|
| `git init` | Initialize a new repository |
| `git add <file>` or `git add .` | Stage files for commit |
| `git commit -m "message"` | Create a new commit |
| `git branch <name>` | Create a new branch |
| `git switch <name>` | Switch to a branch |
| `git merge <branch>` | Merge a branch |
| `git rebase <branch>` | Rebase onto a branch |
| `git status` | Show working tree status |
| `git log` | Show commit history |
| `git diff` | Show changes |
| `git remote add origin <url>` | Add a remote |
| `git fetch` | Fetch from remote |
| `git pull` | Pull from remote |
| `git push` | Push to remote |
| `git reset` | Reset current HEAD |
| `git restore <file>` | Restore working tree files |
| `git revert HEAD` | Create a commit that undoes changes |
| `git stash` | Stash working tree changes |
| `git cherry-pick <commit>` | Apply a specific commit |
| `git reflog` | Show reference log |
| `create <filename>` | Create a file (simulator-only) |

## Graph Visualization

### Branch Colors
Each branch gets a consistent color throughout the session:
- `main` → Blue
- Feature branches → Green, Purple, Orange, etc.
- Colors are deterministic (same branch name = same color)

### Layout
- **Auto Layout** — automatically arrange commits using ELK.js
- **Reset** — clear manual positions and re-layout
- **Fit View** — fit entire graph into viewport
- **Zoom** — scroll wheel or +/- buttons
- **Drag** — click and drag nodes to reposition

### Merge Visualization
When merging, the graph shows:
- Two colored parent edges converging at the merge commit
- Merge commit badge
- Both branch colors preserved

### Rebase Visualization
When rebasing:
- New commits created on top of target branch
- Feature branch commits remain in their lane
- History becomes linear

## Architecture

```
Git Engine (GitRepository.ts)
    ↓
Git State (Zustand store)
    ↓
Graph Adapter (gitToGraph.ts)
    ↓
React Flow (canvas)
    ↑
ELK Layout (layoutEngine.ts)
```

### Key Components

- **GitRepository.ts** — Core Git types and operations
- **gitStore.ts** — Zustand state management
- **gitToGraph.ts** — Converts Git state to React Flow nodes/edges
- **layoutEngine.ts** — ELK-based automatic layout with Git-aware constraints
- **CommitNode.tsx** — Custom React Flow node component
- **GitGraph.tsx** — React Flow canvas with controls
- **Terminal.tsx** — Interactive command terminal

## Tech Stack

- **React 19** — UI framework
- **TypeScript** — Type safety
- **Vite** — Build tool
- **Tailwind CSS** — Styling
- **Zustand** — State management
- **React Flow** — Graph canvas
- **ELK.js** — Automatic layout
- **Lucide React** — Icons
- **Web Audio API** — Sound effects

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT
