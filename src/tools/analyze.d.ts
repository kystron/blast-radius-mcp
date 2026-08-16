export interface MultiTargetBlastRadiusResult {
    targets: string[];
    blastRadius: Record<string, Record<string, string[]>>;
    maxDepth: number;
}
export declare function runBlastRadiusAnalysis(packageName: string, lockfilePath?: string): MultiTargetBlastRadiusResult;
//# sourceMappingURL=analyze.d.ts.map