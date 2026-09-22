import type { GitRepositoryState, Commit, GitIdentity } from '../GitRepository';
import {
  createCommit, addReflogEntry, moveBranch, cloneState, findCommonAncestor,
} from '../GitRepository';

function getCurrentBranchName(state: GitRepositoryState): string {
  return state.HEAD.type === 'branch' ? state.HEAD.value : 'HEAD';
}

export function executeInit(state: GitRepositoryState): { state: GitRepositoryState; output: string; explanation: string } {
  if (state.initialized) {
    return { state, output: 'Reinitialized existing Git repository in .git/', explanation: 'The repository was already initialized.' };
  }
  const newState = cloneState(state);
  newState.initialized = true;
  newState.HEAD = { type: 'branch', value: 'main' };
  newState.branches = [{ name: 'main', commitId: '' }];
  newState.workingTree['README.md'] = '# My Project\n';
  const output = `Initialized empty Git repository in .git/

.git/
├── objects/
├── refs/
├── HEAD
└── config

Created README.md in working directory.`;
  const explanation = 'Created a new Git repository and added a README.md file to the working directory. Use "git add ." to stage it, then "git commit" to commit it.';
  return { state: newState, output, explanation };
}

export function executeCreate(state: GitRepositoryState, filename: string, content?: string): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  const newState = cloneState(state);
  newState.workingTree[filename] = content || `// ${filename}\n`;
  return { state: newState, output: `Created file: ${filename}`, explanation: `Added "${filename}" to the working directory.` };
}

export function executeAdd(state: GitRepositoryState, files: string[]): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository (or any of the parent directories): .git', explanation: 'You need to run git init first.' };
  }
  const newState = cloneState(state);
  let addedFiles = 0;
  files.forEach((file) => {
    if (file === '.') {
      Object.entries(newState.workingTree).forEach(([name, content]) => {
        newState.stagingArea[name] = content;
        addedFiles++;
      });
    } else if (newState.workingTree[file] !== undefined) {
      newState.stagingArea[file] = newState.workingTree[file];
      addedFiles++;
    }
  });
  const output = addedFiles > 0 ? `Staged ${addedFiles} file(s)` : 'No files to add';
  const explanation = 'Files moved from the working directory to the staging area. The staging area is a preparation area for your next commit.';
  return { state: newState, output, explanation };
}

export function executeCommit(state: GitRepositoryState, message: string, identity?: GitIdentity): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository (or any of the parent directories): .git', explanation: 'You need to run git init first.' };
  }
  if (Object.keys(state.stagingArea).length === 0) {
    return { state, output: 'nothing to commit', explanation: 'The staging area is empty. Use git add to stage files first.' };
  }
  const newState = cloneState(state);
  const currentBranchName = newState.HEAD.type === 'branch' ? newState.HEAD.value : '';
  const headCommit = (() => {
    if (newState.HEAD.type === 'commit') return newState.commits[newState.HEAD.value];
    const branch = newState.branches.find((b) => b.name === newState.HEAD.value);
    return branch ? newState.commits[branch.commitId] : null;
  })();
  const parentIds = headCommit ? [headCommit.id] : [];
  const commit = createCommit(parentIds, message, { ...newState.stagingArea }, identity || 'user', currentBranchName || 'main');
  newState.commits[commit.id] = commit;
  if (currentBranchName) {
    moveBranch(newState, currentBranchName, commit.id);
  } else {
    newState.HEAD = { type: 'commit', value: commit.id };
  }
  newState.stagingArea = {};
  addReflogEntry(newState, newState.HEAD.type === 'branch' ? newState.HEAD.value : 'HEAD', commit.id, `commit: ${message}`);
  const output = `[${currentBranchName || 'detached HEAD'} ${commit.id.substring(0, 7)}] ${message}`;
  const explanation = `Created a new commit with id ${commit.id.substring(0, 7)}. The commit is linked to its parent${parentIds.length > 1 ? 's' : parentIds.length === 1 ? '' : ' (root commit)'}.`;
  return { state: newState, output, explanation };
}

export function executeBranch(state: GitRepositoryState, name?: string): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository (or any of the parent directories): .git', explanation: 'You need to run git init first.' };
  }
  if (!name) {
    const branches = state.branches.map((b) => `${b.name === getCurrentBranchName(state) ? '* ' : '  '}${b.name}`).join('\n');
    return { state, output: branches || 'No branches yet', explanation: 'Listing all branches. The * marks the current branch.' };
  }
  if (state.branches.find((b) => b.name === name)) {
    return { state, output: `fatal: a branch named '${name}' already exists`, explanation: 'A branch with that name already exists.' };
  }
  const headCommit = (() => {
    if (state.HEAD.type === 'commit') return state.commits[state.HEAD.value];
    const branch = state.branches.find((b) => b.name === state.HEAD.value);
    return branch ? state.commits[branch.commitId] : null;
  })();
  if (!headCommit) {
    return { state, output: 'fatal: Not a valid object name', explanation: 'Cannot create a branch without a commit.' };
  }
  const newState = cloneState(state);
  newState.branches.push({ name, commitId: headCommit.id, createdAtCommitId: headCommit.id });
  newState.branchCreationPoints[name] = headCommit.id;
  addReflogEntry(newState, name, headCommit.id, `branch: created`);
  const output = `Created branch '${name}' pointing to ${headCommit.id.substring(0, 7)}`;
  const explanation = `Created a new branch reference called '${name}'. A branch is a movable pointer to a commit — it does not duplicate the commit.`;
  return { state: newState, output, explanation };
}

export function executeSwitch(state: GitRepositoryState, name: string, detach?: boolean): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository (or any of the parent directories): .git', explanation: 'You need to run git init first.' };
  }
  const newState = cloneState(state);
  if (detach) {
    const commitId = (() => {
      const branch = state.branches.find((b) => b.name === name);
      if (branch) return branch.commitId;
      return state.commits[name] ? name : null;
    })();
    if (!commitId) {
      return { state, output: `fatal: invalid reference: ${name}`, explanation: 'The specified reference does not exist.' };
    }
    newState.HEAD = { type: 'commit', value: commitId };
    addReflogEntry(newState, 'HEAD', commitId, `checkout: moving from ${getCurrentBranchName(state)} to ${commitId.substring(0, 7)}`);
    return { state: newState, output: `HEAD is now at ${commitId.substring(0, 7)} (detached)`, explanation: 'HEAD now points directly to a commit instead of a branch. This is called a detached HEAD state.' };
  }
  const branch = newState.branches.find((b) => b.name === name);
  if (!branch) {
    return { state, output: `error: pathspec '${name}' did not match any branch`, explanation: `No branch named '${name}' exists.` };
  }
  const oldBranch = getCurrentBranchName(state);
  newState.HEAD = { type: 'branch', value: name };
  addReflogEntry(newState, name, branch.commitId, `checkout: moving from ${oldBranch} to ${name}`);
  return { state: newState, output: `Switched to branch '${name}'`, explanation: `HEAD now points to branch '${name}'.` };
}

export function executeMerge(
  state: GitRepositoryState,
  branchName: string,
  identity?: GitIdentity
): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  const currentBranch = getCurrentBranchName(state);
  if (!currentBranch) {
    return { state, output: 'fatal: HEAD is detached', explanation: 'Cannot merge in detached HEAD state.' };
  }
  const targetBranch = state.branches.find((b) => b.name === branchName);
  if (!targetBranch) {
    return { state, output: `fatal: '${branchName}' is not a branch`, explanation: `No branch named '${branchName}' exists.` };
  }
  const sourceCommitId = targetBranch.commitId;
  const destCommitId = state.branches.find((b) => b.name === currentBranch)?.commitId;
  if (!destCommitId) {
    return { state, output: 'fatal: current branch has no commits', explanation: 'Cannot merge without commits.' };
  }
  if (sourceCommitId === destCommitId) {
    return { state, output: 'Already up to date.', explanation: 'The branches point to the same commit. Nothing to merge.' };
  }
  const ancestorId = findCommonAncestor(state, sourceCommitId, destCommitId);
  if (ancestorId === destCommitId) {
    const newState = cloneState(state);
    moveBranch(newState, currentBranch, sourceCommitId);
    addReflogEntry(newState, currentBranch, sourceCommitId, `merge: Fast-forward`);
    const output = `Fast-forward\nUpdated ${currentBranch} to ${sourceCommitId.substring(0, 7)}`;
    const explanation = 'This was a fast-forward merge. The current branch pointer simply moved forward to the target commit because the current branch was an ancestor of the target branch. No merge commit was needed.';
    return { state: newState, output, explanation };
  }
  const newState = cloneState(state);
  const headCommit = newState.commits[destCommitId];
  const sourceCommit = newState.commits[sourceCommitId];
  const allFiles = { ...(headCommit?.files || {}) };
  Object.entries(sourceCommit?.files || {}).forEach(([k, v]) => { allFiles[k] = v; });
  const mergeCommit = createCommit([destCommitId, sourceCommitId], `Merge branch '${branchName}' into ${currentBranch}`, allFiles, identity || 'user', currentBranch);
  newState.commits[mergeCommit.id] = mergeCommit;
  moveBranch(newState, currentBranch, mergeCommit.id);
  addReflogEntry(newState, currentBranch, mergeCommit.id, `merge: Merge commit`);
  const output = `Merge made by the 'ort' strategy.\n ${mergeCommit.id.substring(0, 7)} Merge branch '${branchName}' into ${currentBranch}`;
  const explanation = `Created merge commit ${mergeCommit.id.substring(0, 7)} with two parents: ${destCommitId.substring(0, 7)} (${currentBranch}) and ${sourceCommitId.substring(0, 7)} (${branchName}). Git combined the two histories.`;
  return { state: newState, output, explanation };
}

export function executeRebase(
  state: GitRepositoryState,
  ontoBranch: string
): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  const currentBranch = getCurrentBranchName(state);
  if (!currentBranch) {
    return { state, output: 'fatal: HEAD is detached', explanation: 'Cannot rebase in detached HEAD state.' };
  }
  const currentBranchObj = state.branches.find((b) => b.name === currentBranch);
  if (!currentBranchObj) {
    return { state, output: 'fatal: current branch has no commits', explanation: 'Cannot rebase without commits.' };
  }
  const ontoBranchObj = state.branches.find((b) => b.name === ontoBranch);
  if (!ontoBranchObj) {
    return { state, output: `fatal: invalid upstream '${ontoBranch}'`, explanation: `No branch named '${ontoBranch}' exists.` };
  }
  const sourceCommitId = currentBranchObj.commitId;
  const ontoCommitId = ontoBranchObj.commitId;
  if (sourceCommitId === ontoCommitId) {
    return { state, output: 'Successfully rebased and updated refs/heads/' + currentBranch, explanation: 'Already up to date.' };
  }
  const ancestorId = findCommonAncestor(state, sourceCommitId, ontoCommitId);
  if (!ancestorId || ancestorId === sourceCommitId) {
    return { state, output: 'Successfully rebased and updated refs/heads/' + currentBranch, explanation: 'Already up to date.' };
  }
  const newState = cloneState(state);
  const commitsToReplay: string[] = [];
  let curId: string | null = sourceCommitId;
  while (curId && curId !== ancestorId) {
    commitsToReplay.unshift(curId);
    const parentCommit: Commit | undefined = newState.commits[curId];
    curId = parentCommit && parentCommit.parentIds.length > 0 ? parentCommit.parentIds[0] : null;
  }
  let newBaseId = ontoCommitId;
  for (const oldCommitId of commitsToReplay) {
    const oldCommit = newState.commits[oldCommitId];
    if (!oldCommit) continue;
    const newCommit = createCommit([newBaseId], oldCommit.message, { ...oldCommit.files }, oldCommit.author, currentBranch);
    newState.commits[newCommit.id] = newCommit;
    newBaseId = newCommit.id;
  }
  moveBranch(newState, currentBranch, newBaseId);
  addReflogEntry(newState, currentBranch, newBaseId, `rebase: ${ontoBranch}`);
  const output = `Successfully rebased and updated refs/heads/${currentBranch}`;
  const explanation = `Rebased ${currentBranch} onto ${ontoBranch}. Git replayed ${commitsToReplay.length} commit(s) onto a new base, creating new commits with different IDs. This produces a linear history.`;
  return { state: newState, output, explanation };
}

export function executeStatus(state: GitRepositoryState): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  const currentBranch = getCurrentBranchName(state);
  const staged = Object.keys(state.stagingArea);
  const unstaged = Object.keys(state.workingTree).filter((f) => !(f in state.stagingArea));
  let output = `On branch ${currentBranch || 'HEAD'}\n`;
  if (staged.length > 0) {
    output += '\nChanges to be committed:\n  ' + staged.map((f) => `  new file:   ${f}`).join('\n');
  }
  if (unstaged.length > 0) {
    output += '\nChanges not staged for commit:\n  ' + unstaged.map((f) => `  modified:   ${f}`).join('\n');
  }
  if (staged.length === 0 && unstaged.length === 0) {
    output += '\nnothing to commit, working tree clean';
  }
  return { state, output, explanation: 'Shows the current state of the working directory and staging area.' };
}

export function executeLog(state: GitRepositoryState): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  const headCommit = (() => {
    if (state.HEAD.type === 'commit') return state.commits[state.HEAD.value];
    const branch = state.branches.find((b) => b.name === state.HEAD.value);
    return branch ? state.commits[branch.commitId] : null;
  })();
  if (!headCommit) {
    return { state, output: 'No commits yet', explanation: 'The repository has no commits.' };
  }
  const log: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = [headCommit.id];
  while (queue.length > 0 && log.length < 20) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const commit = state.commits[id];
    if (commit) {
      log.push(`commit ${commit.id.substring(0, 7)}\nAuthor: ${commit.author}\n\n    ${commit.message}`);
      queue.push(...commit.parentIds);
    }
  }
  return { state, output: log.join('\n\n'), explanation: 'Shows the commit history.' };
}

export function executeDiff(state: GitRepositoryState): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  const headCommit = (() => {
    if (state.HEAD.type === 'commit') return state.commits[state.HEAD.value];
    const branch = state.branches.find((b) => b.name === state.HEAD.value);
    return branch ? state.commits[branch.commitId] : null;
  })();
  const headFiles = headCommit?.files || {};
  const diff: string[] = [];
  Object.keys({ ...state.stagingArea, ...state.workingTree }).forEach((file) => {
    const oldContent = headFiles[file];
    const newContent = state.stagingArea[file] || state.workingTree[file];
    if (oldContent !== newContent) {
      diff.push(`diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}`);
    }
  });
  return { state, output: diff.join('\n\n') || 'No changes', explanation: 'Shows differences between the working directory and the last commit.' };
}

export function executeRemote(state: GitRepositoryState, subcommand?: string, args?: string[]): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  if (subcommand === 'add' && args && args.length >= 2) {
    const remoteName = args[0];
    const url = args[1];
    const newState = cloneState(state);
    newState.remotes.push({ name: remoteName, url, branches: [] });
    addReflogEntry(newState, 'remote', '', `remote: add ${remoteName}`);
    return { state: newState, output: `Added remote '${remoteName}' with URL ${url}`, explanation: `Added a remote repository reference named '${remoteName}'.` };
  }
  const remotes = state.remotes.map((r) => `${r.name}\t${r.url}`).join('\n');
  return { state, output: remotes || 'No remotes configured', explanation: 'Shows configured remote repositories.' };
}

export function executeFetch(state: GitRepositoryState): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  if (state.remotes.length === 0) {
    return { state, output: 'fatal: no remote configured', explanation: 'No remote repositories configured.' };
  }
  const newState = cloneState(state);
  newState.remotes.forEach((remote) => {
    remote.branches.forEach((rb) => {
      const existing = newState.branches.find((b) => b.name === `origin/${rb.name}`);
      if (existing) {
        existing.commitId = rb.commitId;
      } else {
        newState.branches.push({ name: `origin/${rb.name}`, commitId: rb.commitId });
      }
    });
  });
  const output = newState.remotes.map((r) => `From ${r.url}\n * branch            HEAD -> origin/main`).join('\n');
  const explanation = 'Fetched updates from remote. Remote-tracking branches (origin/main) were updated. Your local branches were not changed.';
  return { state: newState, output, explanation };
}

export function executePull(state: GitRepositoryState): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  const fetchResult = executeFetch(state);
  const mergeResult = executeMerge(fetchResult.state, 'origin/main');
  return { state: mergeResult.state, output: fetchResult.output + '\n' + mergeResult.output, explanation: 'Pull = fetch + merge. Fetched remote changes and integrated them into the current branch.' };
}

export function executePush(state: GitRepositoryState): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  const currentBranch = getCurrentBranchName(state);
  if (!currentBranch) {
    return { state, output: 'fatal: HEAD is detached', explanation: 'Cannot push in detached HEAD state.' };
  }
  const branch = state.branches.find((b) => b.name === currentBranch);
  if (!branch) {
    return { state, output: 'fatal: current branch has no commits', explanation: 'Nothing to push.' };
  }
  const newState = cloneState(state);
  newState.remotes.forEach((remote) => {
    const remoteBranch = remote.branches.find((rb) => rb.name === currentBranch);
    if (remoteBranch) {
      remoteBranch.commitId = branch.commitId;
    } else {
      remote.branches.push({ name: currentBranch, commitId: branch.commitId });
    }
  });
  addReflogEntry(newState, currentBranch, branch.commitId, `push: to origin`);
  return { state: newState, output: `Enumerating objects: 100%\nTo ${state.remotes[0]?.url || 'origin'}\n   abc1234..def5678  ${currentBranch} -> ${currentBranch}`, explanation: `Pushed commits from local '${currentBranch}' to remote 'origin/${currentBranch}'.` };
}

export function executeReset(
  state: GitRepositoryState,
  mode: 'soft' | 'mixed' | 'hard',
  target: string
): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  const currentBranch = getCurrentBranchName(state);
  if (!currentBranch) {
    return { state, output: 'fatal: HEAD is detached', explanation: 'Cannot reset in detached HEAD state.' };
  }
  const branch = state.branches.find((b) => b.name === currentBranch);
  if (!branch) {
    return { state, output: 'fatal: current branch has no commits', explanation: 'Nothing to reset.' };
  }
  let commitId = branch.commitId;
  if (target === 'HEAD~1') {
    const commit = state.commits[commitId];
    if (commit && commit.parentIds.length > 0) {
      commitId = commit.parentIds[0];
    } else {
      return { state, output: 'fatal: ambiguous argument: HEAD~1', explanation: 'Cannot reset further.' };
    }
  } else if (state.commits[target]) {
    commitId = target;
  } else {
    return { state, output: `fatal: bad revision '${target}'`, explanation: 'Invalid target reference.' };
  }
  const newState = cloneState(state);
  moveBranch(newState, currentBranch, commitId);
  newState.HEAD = { type: 'branch', value: currentBranch };
  if (mode === 'mixed' || mode === 'hard') {
    newState.stagingArea = {};
  }
  if (mode === 'hard') {
    const commit = newState.commits[commitId];
    newState.workingTree = commit ? { ...commit.files } : {};
  }
  addReflogEntry(newState, currentBranch, commitId, `reset: ${mode}`);
  const output = `HEAD is now at ${commitId.substring(0, 7)} (${mode} reset)`;
  const explanation = `Reset the current branch to ${commitId.substring(0, 7)} using ${mode} mode.${mode === 'soft' ? ' Only the branch pointer moved.' : mode === 'mixed' ? ' Branch pointer moved and staging area was reset.' : ' Branch pointer, staging area, and working tree were all reset.'}`;
  return { state: newState, output, explanation };
}

export function executeRestore(state: GitRepositoryState, file: string): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  const newState = cloneState(state);
  delete newState.stagingArea[file];
  delete newState.workingTree[file];
  return { state: newState, output: `Restored ${file}`, explanation: `Removed '${file}' from the staging area and working directory.` };
}

export function executeRevert(state: GitRepositoryState, commitId?: string, identity?: GitIdentity): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  const currentBranch = getCurrentBranchName(state);
  if (!currentBranch) {
    return { state, output: 'fatal: HEAD is detached', explanation: 'Cannot revert in detached HEAD state.' };
  }
  const branch = state.branches.find((b) => b.name === currentBranch);
  if (!branch) {
    return { state, output: 'fatal: current branch has no commits', explanation: 'Nothing to revert.' };
  }
  const targetId = commitId || branch.commitId;
  const commit = state.commits[targetId];
  if (!commit) {
    return { state, output: `fatal: bad revision '${targetId}'`, explanation: 'Invalid commit reference.' };
  }
  const newState = cloneState(state);
  const parentCommit = commit.parentIds.length > 0 ? newState.commits[commit.parentIds[0]] : null;
  const revertedFiles = { ...(parentCommit?.files || {}) };
  const revertCommit = createCommit([branch.commitId], `Revert "${commit.message}"`, revertedFiles, identity || 'user', currentBranch);
  newState.commits[revertCommit.id] = revertCommit;
  moveBranch(newState, currentBranch, revertCommit.id);
  addReflogEntry(newState, currentBranch, revertCommit.id, `revert: ${targetId.substring(0, 7)}`);
  return { state: newState, output: `[${currentBranch} ${revertCommit.id.substring(0, 7)}] Revert "${commit.message}"`, explanation: `Created a new commit that reverses the changes from commit ${targetId.substring(0, 7)}. Revert does NOT delete the original commit.` };
}

export function executeStash(state: GitRepositoryState): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  if (Object.keys(state.stagingArea).length === 0 && Object.keys(state.workingTree).length === 0) {
    return { state, output: 'No local changes to save', explanation: 'Nothing to stash.' };
  }
  const newState = cloneState(state);
  newState.stagingArea = {};
  newState.workingTree = {};
  return { state: newState, output: 'Saved working directory state', explanation: 'Stashed your working directory changes. You can restore them later with git stash pop.' };
}

export function executeCherryPick(state: GitRepositoryState, cherryPickCommitId: string, _identity?: GitIdentity): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  const currentBranch = getCurrentBranchName(state);
  if (!currentBranch) {
    return { state, output: 'fatal: HEAD is detached', explanation: 'Cannot cherry-pick in detached HEAD state.' };
  }
  const commit = state.commits[cherryPickCommitId];
  if (!commit) {
    return { state, output: `fatal: bad revision '${cherryPickCommitId}'`, explanation: 'Invalid commit reference.' };
  }
  const branch = state.branches.find((b) => b.name === currentBranch);
  if (!branch) {
    return { state, output: 'fatal: current branch has no commits', explanation: 'Nothing to cherry-pick onto.' };
  }
  const newState = cloneState(state);
  const newCommit = createCommit([branch.commitId], commit.message, { ...commit.files }, commit.author, currentBranch);
  newState.commits[newCommit.id] = newCommit;
  moveBranch(newState, currentBranch, newCommit.id);
  addReflogEntry(newState, currentBranch, newCommit.id, `cherry-pick: ${cherryPickCommitId.substring(0, 7)}`);
  return { state: newState, output: `[${currentBranch} ${newCommit.id.substring(0, 7)}] ${commit.message}`, explanation: `Applied commit ${cherryPickCommitId.substring(0, 7)} as a new commit on the current branch.` };
}

export function executeReflog(state: GitRepositoryState): { state: GitRepositoryState; output: string; explanation: string } {
  if (!state.initialized) {
    return { state, output: 'fatal: not a git repository', explanation: 'You need to run git init first.' };
  }
  const log = state.reflog.slice(0, 20).map((entry, i) =>
    `${entry.commitId.substring(0, 7)} ${entry.action} HEAD@{${i}}`
  ).join('\n');
  return { state, output: log || 'No reflog entries', explanation: 'The reflog records every time HEAD moves. It is useful for recovering lost commits.' };
}

export function executeCheckout(state: GitRepositoryState, name: string): { state: GitRepositoryState; output: string; explanation: string } {
  const branch = state.branches.find((b) => b.name === name);
  if (branch) {
    return executeSwitch(state, name);
  }
  if (state.commits[name]) {
    return executeSwitch(state, name, true);
  }
  return { state, output: `error: pathspec '${name}' did not match any branch or commit`, explanation: 'Invalid branch or commit reference.' };
}
