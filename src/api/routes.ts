import express from 'express';
import { runFullSecurityAudit } from '../tools/audit.js';
import { buildGraph } from '../graph/builder.js';
import { parseNpmLockfile } from '../parsers/npm-lock.js';
import * as path from 'path';

export const apiRouter = express.Router();

// A generic function to get the base graph
function getGraph() {
    const targetPath = path.join(process.cwd(), 'package-lock.json');
    const records = parseNpmLockfile(targetPath);
    return buildGraph(records);
}

apiRouter.get('/graph', async (req, res) => {
    try {
        // Run full security audit to get risk scores and vulnerabilities populated
        // (For production, this might be cached, but for this tool we run it dynamically)
        const audit = await runFullSecurityAudit();
        
        // We will build a frontend-friendly graph structure
        const targetPath = path.join(process.cwd(), 'package-lock.json');
        const records = parseNpmLockfile(targetPath);
        const graph = buildGraph(records);

        // Extract all attack paths from audit to mark edges
        const attackEdges = new Set<string>();
        const vulnNodes = new Map<string, any>();

        for (const vuln of audit.vulnerabilities) {
            vulnNodes.set(vuln.package, vuln);
            
            for (const path of vuln.attackPaths) {
                // path.path is an array of package names like: ["blast-radius-mcp", "lodash"]
                for (let i = 0; i < path.path.length - 1; i++) {
                    const source = path.path[i];
                    const target = path.path[i+1];
                    attackEdges.add(`${source}->${target}`);
                }
            }
        }

        const nodes = [];
        const edges = [];

        // For simplicity, we just use the first node found for a given package name to represent the package in the galaxy
        const processedPackages = new Set<string>();

        for (const node of graph.getAllNodes()) {
            if (processedPackages.has(node.name)) continue;
            processedPackages.add(node.name);

            // Determine Layer
            // Layer 0: root (no dependents)
            // Layer 1: direct dependency of root
            // Layer 2+: transitive
            let layer = 2;
            const dependents = graph.getDependents(node.id);
            if (dependents.length === 0) {
                layer = 0;
            } else {
                for (const depId of dependents) {
                    const depNode = graph.getNode(depId);
                    if (depNode && graph.getDependents(depNode.id).length === 0) {
                        layer = 1; // direct dep of root
                        break;
                    }
                }
            }

            const vulnInfo = vulnNodes.get(node.name);
            let type = "standard";
            if (layer === 0) type = "root";
            else if (layer === 1) type = "direct";
            
            if (vulnInfo) {
                type = "vulnerable";
            }

            nodes.push({
                id: node.name,
                name: node.name,
                version: node.version,
                type: type,
                layer: layer,
                riskScore: vulnInfo ? vulnInfo.riskScore : 0,
                severity: vulnInfo ? vulnInfo.severity : "NONE",
                vulnerabilityDetails: vulnInfo ? vulnInfo : null
            });

            // Map edges
            for (const edge of graph.getDependencies(node.id)) {
                const targetName = edge.packageName;
                
                let edgeType = "dependency";
                if (attackEdges.has(`${node.name}->${targetName}`)) {
                    edgeType = "attack";
                }

                edges.push({
                    source: node.name,
                    target: targetName,
                    type: edgeType,
                    constraint: edge.constraint
                });
            }
        }

        res.json({ nodes, edges });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/audit', async (req, res) => {
    try {
        const audit = await runFullSecurityAudit();
        res.json(audit);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
