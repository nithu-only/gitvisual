import type { Node, Edge } from '@xyflow/react';
import type { Commit } from '../git/GitRepository';

export interface CommitNodeData extends Record<string, unknown> {
  commit: Commit;
  shortId: string;
  message: string;
  timestamp: number;
  branches: string[];
  isHead: boolean;
  headBranch: string;
  isMerge: boolean;
  branchColor: string;
  branchName: string;
  branchCreationPoints?: string[];
}

export type CommitNode = Node<CommitNodeData, 'commit'>;
export type CommitEdge = Edge;

export interface GraphLayoutState {
  [commitId: string]: { x: number; y: number };
}
