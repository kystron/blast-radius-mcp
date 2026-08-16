"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGraph = buildGraph;
const types_1 = require("./types");
const DependencyGraph_1 = require("./DependencyGraph");
function buildGraph(records) {
    const graph = new DependencyGraph_1.DependencyGraph();
    // First pass: create all nodes
    // Map of packageName -> array of Node IDs for that package
    const packageToIds = new Map();
    for (const record of records) {
        const id = `${record.name}@${record.version}`;
        const node = {
            id,
            name: record.name,
            version: record.version,
            ecosystem: record.ecosystem,
            dependencies: new Set(),
            dependents: new Set(),
            metadata: {}
        };
        graph.addNode(node);
        if (!packageToIds.has(record.name)) {
            packageToIds.set(record.name, []);
        }
        packageToIds.get(record.name).push(id);
    }
    // Second pass: wire up edges
    for (const record of records) {
        const fromId = `${record.name}@${record.version}`;
        for (const depName of record.dependencies) {
            // Find the best match for depName. 
            // In a real module resolver, this checks the directory tree hierarchy.
            // For MVP, if there is only 1 version installed globally, use it.
            // If multiple, use the first one (simplification for MVP).
            const targetIds = packageToIds.get(depName);
            if (targetIds && targetIds.length > 0) {
                const targetId = targetIds[0];
                graph.addEdge(fromId, targetId);
            }
        }
    }
    return graph;
}
//# sourceMappingURL=builder.js.map