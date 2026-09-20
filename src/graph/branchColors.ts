const BRANCH_PALETTE = [
  '#1f6feb',
  '#3fb950',
  '#bc8cff',
  '#d29922',
  '#f85149',
  '#79c0ff',
  '#56d364',
  '#d2a8ff',
  '#e3b341',
  '#ff7b72',
  '#39d353',
  '#a5d6ff',
  '#f0883e',
  '#db61a2',
  '#7ee787',
];

const colorAssignments = new Map<string, string>();

function hashBranchName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getBranchColor(branchName: string): string {
  const normalized = branchName.replace('origin/', '');

  if (colorAssignments.has(normalized)) {
    return colorAssignments.get(normalized)!;
  }

  if (normalized === 'main' || normalized === 'master') {
    const color = BRANCH_PALETTE[0];
    colorAssignments.set(normalized, color);
    return color;
  }

  const hash = hashBranchName(normalized);
  const colorIndex = hash % BRANCH_PALETTE.length;
  const color = BRANCH_PALETTE[colorIndex];
  colorAssignments.set(normalized, color);
  return color;
}

export function getEdgeColor(
  sourceBranch: string,
  targetBranch: string,
  isMergeEdge: boolean,
  _isRemote: boolean
): string {
  const color = isMergeEdge ? getBranchColor(sourceBranch) : getBranchColor(targetBranch);
  return color;
}

export function getNodeBorderColor(branchName: string): string {
  return getBranchColor(branchName);
}

export function resetColorAssignments(): void {
  colorAssignments.clear();
}

export function getAllBranchColors(branches: string[]): Map<string, string> {
  const map = new Map<string, string>();
  branches.forEach(b => {
    map.set(b, getBranchColor(b));
  });
  return map;
}
