import { DependencyGraph } from './DependencyGraph.js';
import { PackageNode } from './types.js';

export interface BlastRadiusResult {
    target: string;
    blastRadius: Record<string, string[]>;
    maxDepth: number;
}

export function reverseBFS(graph: DependencyGraph, targetId: string): BlastRadiusResult {
    const visited = new Set<string>();
    const queue: { id: string, depth: number }[] = [];
    
    // The result structure: { "depth_1": ["pkg-a"], "depth_2": ["pkg-b"] }
    const blastRadius: Record<string, string[]> = {};
    let maxDepth = 0;
    
    queue.push({ id: targetId, depth: 0 });
    visited.add(targetId);
    
    while (queue.length > 0) {
        const { id, depth } = queue.shift()!;
        
        // Don't record the target itself in the blast radius
        if (depth > 0) {
            const depthKey = `depth_${depth}`;
            if (!blastRadius[depthKey]) {
                blastRadius[depthKey] = [];
            }
            
            const node = graph.getNode(id);
            if (node) {
                // For simplified output, we can just push the bare name, 
                // or name@version. The prompt uses name or name@version.
                // Let's use name to match standard security expectations.
                blastRadius[depthKey].push(node.name);
            }
            
            if (depth > maxDepth) {
                maxDepth = depth;
            }
        }
        
        // Find all dependents (packages that depend ON this package)
        const dependents = graph.getDependents(id);
        
        for (const depId of dependents) {
            if (!visited.has(depId)) {
                visited.add(depId);
                queue.push({ id: depId, depth: depth + 1 });
            }
        }
    }
    
    // Deduplicate array contents (in case multiple paths led to same package name at same depth)
    for (const key in blastRadius) {
        blastRadius[key] = Array.from(new Set(blastRadius[key]));
    }
    
    return {
        target: targetId,
        blastRadius,
        maxDepth
    };
}
