import { PackageRecord, PackageNode } from './types.js';
import { DependencyGraph } from './DependencyGraph.js';

function resolveDependency(sourcePath: string, depName: string, pathMap: Map<string, PackageRecord>): PackageRecord | undefined {
    let currentPath = sourcePath;
    
    while (true) {
        const checkPath = currentPath === "" 
            ? `node_modules/${depName}` 
            : `${currentPath}/node_modules/${depName}`;
            
        if (pathMap.has(checkPath)) {
            return pathMap.get(checkPath);
        }
        
        if (currentPath === "") {
            break;
        }
        
        const lastIndex = currentPath.lastIndexOf('node_modules/');
        if (lastIndex > 0) {
            // Remove the trailing slash before node_modules
            currentPath = currentPath.substring(0, lastIndex - 1);
        } else if (lastIndex === 0) {
            currentPath = "";
        } else {
            break;
        }
    }
    
    return undefined;
}

export function buildGraph(records: PackageRecord[]): DependencyGraph {
    const graph = new DependencyGraph();
    const pathMap = new Map<string, PackageRecord>();
    const nameMap = new Map<string, PackageRecord[]>();
    
    // First pass: index all records by path and create nodes
    for (const record of records) {
        pathMap.set(record.path, record);
        
        if (!nameMap.has(record.name)) {
            nameMap.set(record.name, []);
        }
        nameMap.get(record.name)!.push(record);
        
        const id = `${record.name}@${record.version}`;
        
        // Add to graph if not already added (multiple paths could resolve to same exact name@version, but we map them as one node conceptually)
        if (!graph.getNode(id)) {
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
        }
    }
    
    // Second pass: wire up edges accurately based on path resolution
    for (const record of records) {
        const fromId = `${record.name}@${record.version}`;
        
        // Wire standard dependencies
        for (const [depName, constraint] of Object.entries(record.dependencies)) {
            const resolvedTarget = resolveDependency(record.path, depName, pathMap);
            if (resolvedTarget) {
                const targetId = `${resolvedTarget.name}@${resolvedTarget.version}`;
                // If it's a dev dependency in the lockfile, mark edge as dev
                const depType = resolvedTarget.isDev ? "devDependencies" : "dependencies";
                graph.addEdge(fromId, targetId, depName, constraint, depType, false, resolvedTarget.isDev);
            } else {
                // Fallback: just grab any matching name if resolution fails (e.g. v1 lockfiles with missing path info)
                const fallbacks = nameMap.get(depName);
                if (fallbacks && fallbacks.length > 0) {
                    const fallback = fallbacks[0];
                    const targetId = `${fallback.name}@${fallback.version}`;
                    const depType = fallback.isDev ? "devDependencies" : "dependencies";
                    graph.addEdge(fromId, targetId, depName, constraint, depType, false, fallback.isDev);
                }
            }
        }

        // Wire peer dependencies
        for (const [peerName, constraint] of Object.entries(record.peerDependencies)) {
            const resolvedTarget = resolveDependency(record.path, peerName, pathMap);
            if (resolvedTarget) {
                const targetId = `${resolvedTarget.name}@${resolvedTarget.version}`;
                const depType = "peerDependencies";
                graph.addEdge(fromId, targetId, peerName, constraint, depType, true, resolvedTarget.isDev);
            } else {
                const fallbacks = nameMap.get(peerName);
                if (fallbacks && fallbacks.length > 0) {
                    const fallback = fallbacks[0];
                    const targetId = `${fallback.name}@${fallback.version}`;
                    const depType = "peerDependencies";
                    graph.addEdge(fromId, targetId, peerName, constraint, depType, true, fallback.isDev);
                }
            }
        }
    }
    
    return graph;
}
