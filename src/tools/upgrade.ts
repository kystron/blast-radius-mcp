import * as path from 'path';
import * as fs from 'fs';
import semver from 'semver';
import { parseNpmLockfile } from '../parsers/npm-lock.js';
import { buildGraph } from '../graph/builder.js';
import { DependencyGraph } from '../graph/DependencyGraph.js';

export interface UpgradeImpactResult {
    upgrade: {
        package: string;
        from: string[];
        to: string;
    };
    impact: Record<string, any[]>; // depth -> array of affected nodes
    summary: {
        safe: number;
        warning: number;
        break: number;
    };
}

export function runUpgradeAnalysis(packageName: string, targetVersion: string, lockfilePath?: string): UpgradeImpactResult {
    const targetPath = lockfilePath || path.join(process.cwd(), 'package-lock.json');
    if (!fs.existsSync(targetPath)) {
        throw new Error(`package-lock.json not found at ${targetPath}`);
    }

    const records = parseNpmLockfile(targetPath);
    const graph = buildGraph(records);
    const targets = graph.findPackages(packageName);

    if (targets.length === 0) {
        throw new Error(`Package ${packageName} not found in dependency tree.`);
    }

    const result: UpgradeImpactResult = {
        upgrade: {
            package: packageName,
            from: targets.map(t => t.version),
            to: targetVersion
        },
        impact: {},
        summary: { safe: 0, warning: 0, break: 0 }
    };

    // We will do a reverse BFS from the targets.
    // For MVP, we only analyze direct dependents of the targets, 
    // or transitive dependents if they inherit a break.
    // The instructions specified a reverse BFS. Let's do it similarly to blast radius.
    
    const visited = new Set<string>();
    const queue: { id: string, depth: number }[] = [];
    
    for (const target of targets) {
        queue.push({ id: target.id, depth: 0 });
        visited.add(target.id);
    }
    
    while (queue.length > 0) {
        const { id, depth } = queue.shift()!;
        
        if (depth > 0) {
            const depthKey = `depth_${depth}`;
            if (!result.impact[depthKey]) {
                result.impact[depthKey] = [];
            }
            
            const node = graph.getNode(id);
            if (node) {
                // If it's depth 1, it's a direct dependent of the upgraded package.
                // We can extract its explicit constraint for the upgraded package.
                let status = "WARNING";
                let reason = "Transitive dependency requires validation";
                
                const edges = graph.getDependencies(id);
                const edge = edges.find(e => e.packageName === packageName);
                
                if (edge) {
                    // Direct dependent! Evaluate semver
                    if (semver.satisfies(targetVersion, edge.constraint)) {
                        status = "SAFE";
                        reason = `supports ${edge.constraint}`;
                        result.summary.safe++;
                    } else {
                        status = "BREAK";
                        reason = `requires ${edge.constraint} (does not satisfy ${targetVersion})`;
                        if (edge.isPeer) {
                            reason = `peer dependency requires ${edge.constraint} (does not satisfy ${targetVersion})`;
                            status = "WARNING"; // Or BREAK depending on strictness. Let's use WARNING for peers that fail, or keep as BREAK. User said WARNING for peer dependency uncertainty.
                            result.summary.warning++;
                        } else {
                            result.summary.break++;
                        }
                    }
                } else {
                    // Transitive dependent
                    result.summary.warning++;
                }
                
                result.impact[depthKey].push({
                    name: node.name,
                    status,
                    reason
                });
            }
        }
        
        const dependents = graph.getDependents(id);
        for (const depId of dependents) {
            if (!visited.has(depId)) {
                visited.add(depId);
                queue.push({ id: depId, depth: depth + 1 });
            }
        }
    }
    
    return result;
}
