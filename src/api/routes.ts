import express from "express";
import * as path from "path";
import fs from "fs";

import { runFullSecurityAudit } from "../tools/audit.js";
import { buildGraph } from "../graph/builder.js";
import { parseNpmLock } from "../parsers/npm-lock.js";

export const apiRouter = express.Router();

/**
 * Build the dependency graph from package-lock.json.
 */
function getGraph() {
    const targetPath = path.join(
        process.cwd(),
        "package-lock.json"
    );

    if (!fs.existsSync(targetPath)) {
        throw new Error(
            `package-lock.json not found at ${targetPath}`
        );
    }

    const records = parseNpmLock(targetPath);

    return buildGraph(records);
}

/**
 * Get the root application's package name.
 */
function getRootPackageName(): string | undefined {
    const targetPath = path.join(
        process.cwd(),
        "package-lock.json"
    );

    if (!fs.existsSync(targetPath)) {
        throw new Error(
            `package-lock.json not found at ${targetPath}`
        );
    }

    const lock = JSON.parse(
        fs.readFileSync(targetPath, "utf-8")
    );

    return lock.packages?.[""]?.name;
}

/**
 * Get dependency names declared by the root application.
 */
function getRootDependencyNames(): Set<string> {
    const targetPath = path.join(
        process.cwd(),
        "package-lock.json"
    );

    if (!fs.existsSync(targetPath)) {
        throw new Error(
            `package-lock.json not found at ${targetPath}`
        );
    }

    const lock = JSON.parse(
        fs.readFileSync(targetPath, "utf-8")
    );

    const root = lock.packages?.[""] ?? {};

    return new Set<string>([
        ...Object.keys(root.dependencies ?? {}),
        ...Object.keys(root.devDependencies ?? {}),
        ...Object.keys(root.optionalDependencies ?? {}),
        ...Object.keys(root.peerDependencies ?? {})
    ]);
}

/**
 * GET /graph
 *
 * Returns dependency nodes, dependency edges, vulnerability
 * information, attack-path edges, and root package metadata.
 */
apiRouter.get("/graph", async (_req, res) => {
    try {
        const audit = await runFullSecurityAudit();
        const graph = getGraph();

        const rootPackage = getRootPackageName();
        const rootDependencyNames = getRootDependencyNames();

        /*
         * Index vulnerabilities by package name and version.
         * Keep the highest-risk finding for duplicate keys.
         */
        const vulnNodes = new Map<string, any>();

        for (const vuln of audit.vulnerabilities) {
            const key = `${vuln.package}@${vuln.version}`;
            const existing = vulnNodes.get(key);

            if (
                !existing ||
                vuln.riskScore > existing.riskScore
            ) {
                vulnNodes.set(key, vuln);
            }
        }

        /*
         * Collect attack-path edges.
         *
         * The risk engine represents packages as package@version.
         */
        const attackEdges = new Set<string>();

        for (const vuln of audit.vulnerabilities) {
            for (const attack of vuln.attackPaths ?? []) {
                for (
                    let i = 0;
                    i < attack.path.length - 1;
                    i++
                ) {
                    attackEdges.add(
                        `${attack.path[i]}->${attack.path[i + 1]}`
                    );
                }
            }
        }

        const nodes: any[] = [];
        const edges: any[] = [];

        /*
         * Build visualization nodes.
         *
         * The current parser skips the root application record.
         * Therefore, the root is returned as metadata rather than
         * as a graph node.
         */
        for (const node of graph.getAllNodes()) {
            /*
             * A direct dependency must be declared by the root
             * application and installed at its top-level node_modules
             * location. Nested copies are not treated as direct.
             */
            const isDirectDependency =
                rootDependencyNames.has(node.name) &&
                node.id.endsWith(
                    `#node_modules/${node.name}`
                );

            const layer = isDirectDependency ? 1 : 2;

            /*
             * Match vulnerability findings using package@version,
             * rather than node.id, which also includes the lockfile path.
             */
            const vulnerability = vulnNodes.get(
                `${node.name}@${node.version}`
            );

            let type = isDirectDependency
                ? "direct"
                : "standard";

            if (vulnerability) {
                type = "vulnerable";
            }

            nodes.push({
                id: node.id,
                name: node.name,
                version: node.version,
                type,
                layer,
                riskScore: vulnerability?.riskScore ?? 0,
                severity: vulnerability?.severity ?? "NONE",
                vulnerabilityDetails: vulnerability ?? null
            });

            /*
             * Build dependency edges and mark edges that match
             * the attack paths reported by the risk engine.
             */
            for (const edge of graph.getDependencies(node.id)) {
                const target = graph.getNode(edge.targetId);

                if (!target) {
                    continue;
                }

                const attackByLabel =
                    `${node.name}@${node.version}->` +
                    `${target.name}@${target.version}`;

                edges.push({
                    source: node.id,
                    target: target.id,
                    type: attackEdges.has(attackByLabel)
                        ? "attack"
                        : "dependency",
                    constraint: edge.constraint,
                    dependencyType: edge.dependencyType,
                    isDev: edge.isDev ?? false
                });
            }
        }

        res.json({
            nodes,
            edges,
            root: rootPackage ?? null
        });
    } catch (err: unknown) {
        console.error(
            "Failed to generate dependency graph:",
            err
        );

        res.status(500).json({
            error: "Failed to generate dependency graph"
        });
    }
});

/**
 * GET /audit
 *
 * Returns the full security audit result.
 */
apiRouter.get("/audit", async (_req, res) => {
    try {
        const audit = await runFullSecurityAudit();

        res.json(audit);
    } catch (err: unknown) {
        console.error(
            "Failed to run security audit:",
            err
        );

        res.status(500).json({
            error: "Failed to run security audit"
        });
    }
});
