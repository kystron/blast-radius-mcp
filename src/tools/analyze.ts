import * as path from 'path';
import * as fs from 'fs';
import { parseNpmLockfile } from '../parsers/npm-lock.js';
import { buildGraph } from '../graph/builder.js';
import { reverseBFS, BlastRadiusResult } from '../graph/traversal.js';

export interface MultiTargetBlastRadiusResult {
    targets: string[];
    blastRadius: Record<string, Record<string, string[]>>;
    maxDepth: number;
}

export function runBlastRadiusAnalysis(packageName: string, lockfilePath?: string): MultiTargetBlastRadiusResult {
    // Determine lockfile path
    const targetPath = lockfilePath || path.join(process.cwd(), 'package-lock.json');
    
    if (!fs.existsSync(targetPath)) {
        throw new Error(`package-lock.json not found at ${targetPath}`);
    }

    // Parse & Build Graph
    const records = parseNpmLockfile(targetPath);
    const graph = buildGraph(records);
    
    // Find all versions of the requested package
    const targets = graph.findPackages(packageName);
    
    if (targets.length === 0) {
        throw new Error(`Package ${packageName} not found in dependency tree.`);
    }
    
    const combinedResult: MultiTargetBlastRadiusResult = {
        targets: [],
        blastRadius: {},
        maxDepth: 0
    };
    
    // Run Reverse BFS for every version found
    for (const target of targets) {
        combinedResult.targets.push(target.id);
        
        const result = reverseBFS(graph, target.id);
        combinedResult.blastRadius[target.id] = result.blastRadius;
        
        if (result.maxDepth > combinedResult.maxDepth) {
            combinedResult.maxDepth = result.maxDepth;
        }
    }
    
    return combinedResult;
}
