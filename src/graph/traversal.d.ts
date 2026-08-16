import { DependencyGraph } from './DependencyGraph';
export interface BlastRadiusResult {
    target: string;
    blastRadius: Record<string, string[]>;
    maxDepth: number;
}
export declare function reverseBFS(graph: DependencyGraph, targetId: string): BlastRadiusResult;
//# sourceMappingURL=traversal.d.ts.map