"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyGraph = void 0;
const types_1 = require("./types");
class DependencyGraph {
    nodes;
    constructor() {
        this.nodes = new Map();
    }
    addNode(node) {
        if (!this.nodes.has(node.id)) {
            this.nodes.set(node.id, node);
        }
    }
    addEdge(fromId, toId) {
        const fromNode = this.nodes.get(fromId);
        const toNode = this.nodes.get(toId);
        if (fromNode && toNode) {
            fromNode.dependencies.add(toId);
            toNode.dependents.add(fromId);
        }
    }
    getNode(id) {
        return this.nodes.get(id);
    }
    getDependents(id) {
        const node = this.nodes.get(id);
        return node ? Array.from(node.dependents) : [];
    }
    getDependencies(id) {
        const node = this.nodes.get(id);
        return node ? Array.from(node.dependencies) : [];
    }
    findPackages(name) {
        const results = [];
        for (const node of this.nodes.values()) {
            if (node.name === name) {
                results.push(node);
            }
        }
        return results;
    }
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
}
exports.DependencyGraph = DependencyGraph;
//# sourceMappingURL=DependencyGraph.js.map