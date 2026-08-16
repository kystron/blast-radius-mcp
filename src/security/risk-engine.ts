import { DependencyGraph } from '../graph/DependencyGraph.js';
import { Vulnerability, Severity } from '../graph/types.js';

export interface AttackPath {
    entry: string;
    vulnerable: string;
    depth: number;
    path: string[];
    isDevPath: boolean;
}

export interface VulnerableNode {
    id: string;
    package: string;
    version: string;
    severity: Severity;
    summary: string;
    riskScore: number;
    attackPaths: AttackPath[];
}

export interface SecurityAuditResult {
    summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    vulnerabilities: VulnerableNode[];
}

function getSeverityScore(severity: Severity): number {
    switch (severity) {
        case 'CRITICAL': return 100;
        case 'HIGH': return 80;
        case 'MEDIUM': return 50;
        case 'LOW': return 20;
        default: return 10;
    }
}

export function runSecurityAudit(graph: DependencyGraph): SecurityAuditResult {
    const result: SecurityAuditResult = {
        summary: { critical: 0, high: 0, medium: 0, low: 0 },
        vulnerabilities: []
    };

    const allNodes = graph.getAllNodes();

    for (const node of allNodes) {
        if (!node.metadata.vulnerabilities || node.metadata.vulnerabilities.length === 0) continue;

        // Take the highest severity vulnerability for the node
        const topVuln = node.metadata.vulnerabilities.sort((a, b) => 
            getSeverityScore(b.severity) - getSeverityScore(a.severity)
        )[0];

        // Tally summary
        if (topVuln.severity === 'CRITICAL') result.summary.critical++;
        else if (topVuln.severity === 'HIGH') result.summary.high++;
        else if (topVuln.severity === 'MEDIUM') result.summary.medium++;
        else result.summary.low++;

        // Calculate Attack Paths via Reverse BFS
        const attackPaths: AttackPath[] = [];
        const visited = new Set<string>();
        const queue: { id: string, depth: number, path: string[], isDevPath: boolean }[] = [];
        
        queue.push({ id: node.id, depth: 0, path: [node.name], isDevPath: false });
        visited.add(node.id);

        let minProdDepth = 999;
        let minDevDepth = 999;

        while (queue.length > 0) {
            const { id, depth, path, isDevPath } = queue.shift()!;
            
            const dependents = graph.getDependents(id);
            
            if (dependents.length === 0 && depth > 0) {
                attackPaths.push({
                    entry: path[path.length - 1],
                    vulnerable: node.name,
                    depth,
                    path: [...path].reverse(),
                    isDevPath
                });
                
                if (isDevPath) {
                    if (depth < minDevDepth) minDevDepth = depth;
                } else {
                    if (depth < minProdDepth) minProdDepth = depth;
                }
            }

            for (const depId of dependents) {
                if (!visited.has(depId)) {
                    visited.add(depId);
                    const depNode = graph.getNode(depId);
                    const edge = graph.getDependencyEdge(depId, id);
                    if (depNode && edge) {
                        queue.push({ 
                            id: depId, 
                            depth: depth + 1, 
                            path: [...path, depNode.name],
                            isDevPath: isDevPath || !!edge.isDev
                        });
                    }
                }
            }
        }

        // Calculate Risk Score
        // Priority to prod paths. If no prod paths exist, fallback to dev paths.
        let effectiveDepth = 0;
        let reachability = 1.0;
        
        if (minProdDepth !== 999) {
            effectiveDepth = minProdDepth;
            reachability = 1.0;
        } else if (minDevDepth !== 999) {
            effectiveDepth = minDevDepth;
            reachability = 0.3;
        } else {
            // Root node itself is vulnerable
            effectiveDepth = 0;
            reachability = 1.0;
        }

        const depthFactor = 1 / Math.log2(effectiveDepth + 2);
        const riskScore = Math.round(getSeverityScore(topVuln.severity) * reachability * depthFactor);

        result.vulnerabilities.push({
            id: topVuln.id,
            package: node.name,
            version: node.version,
            severity: topVuln.severity,
            summary: topVuln.summary,
            riskScore,
            attackPaths
        });
    }

    // Sort output by highest risk first
    result.vulnerabilities.sort((a, b) => b.riskScore - a.riskScore);

    return result;
}
