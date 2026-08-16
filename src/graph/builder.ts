import { PackageRecord, PackageNode } from './types.js';
import { DependencyGraph } from './DependencyGraph.js';

export function buildGraph(records: PackageRecord[]): DependencyGraph {
    const graph = new DependencyGraph();
    
    // First pass: create all nodes
    const packageToIds = new Map<string, string[]>();
    
    for (const record of records) {
        const id = `${record.name}@${record.version}`;
        
        const node: PackageNode = {
            id,
            name: record.name,
            version: record.version,
            ecosystem: record.ecosystem as any,
            dependencies: new Map(),
            dependents: new Set(),
            metadata: {}
        };
        
        graph.addNode(node);
        
        if (!packageToIds.has(record.name)) {
            packageToIds.set(record.name, []);
        }
        packageToIds.get(record.name)!.push(id);
    }
    
    // Second pass: wire up edges
    for (const record of records) {
        const fromId = `${record.name}@${record.version}`;
        
        // Wire standard dependencies
        for (const [depName, constraint] of Object.entries(record.dependencies)) {
            const targetIds = packageToIds.get(depName);
            if (targetIds && targetIds.length > 0) {
                const targetId = targetIds[0];
                graph.addEdge(fromId, targetId, depName, constraint, false);
            }
        }

        // Wire peer dependencies
        for (const [peerName, constraint] of Object.entries(record.peerDependencies)) {
            const targetIds = packageToIds.get(peerName);
            if (targetIds && targetIds.length > 0) {
                const targetId = targetIds[0];
                graph.addEdge(fromId, targetId, peerName, constraint, true);
            }
        }
    }
    
    return graph;
}
