import { DependencyGraph } from '../graph/DependencyGraph.js';
import { Vulnerability, Severity } from '../graph/types.js';

export interface AttackPath {
    entry: string;
    vulnerable: string;
    depth: number;
    path: string[];
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
        const queue: { id: string, depth: number, path: string[] }[] = [];
        
        queue.push({ id: node.id, depth: 0, path: [node.name] });
        visited.add(node.id);

        let minDepth = 999;

        while (queue.length > 0) {
            const { id, depth, path } = queue.shift()!;
            
            const dependents = graph.getDependents(id);
            
            // If it has no dependents, it's a top-level entry point (like our own app)
            if (dependents.length === 0 && depth > 0) {
                attackPaths.push({
                    entry: path[path.length - 1],
                    vulnerable: node.name,
                    depth,
                    path: [...path].reverse() // Reverse so it reads Entry -> Dep -> Vuln
                });
                
                if (depth < minDepth) minDepth = depth;
            }

            for (const depId of dependents) {
                if (!visited.has(depId)) {
                    visited.add(depId);
                    const depNode = graph.getNode(depId);
                    if (depNode) {
                        queue.push({ 
                            id: depId, 
                            depth: depth + 1, 
                            path: [...path, depNode.name] 
                        });
                    }
                }
            }
        }

        // Calculate Risk Score
        // Base severity score reduced by depth. If minDepth is 999 (no entry points found), 
        // it means it's an isolated node (maybe root itself).
        const depthPenalty = minDepth === 999 ? 1 : (minDepth + 1);
        const riskScore = Math.round(getSeverityScore(topVuln.severity) / depthPenalty);

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
