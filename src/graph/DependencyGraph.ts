import { PackageNode, DependencyEdge } from './types.js';

export class DependencyGraph {
    private nodes: Map<string, PackageNode>;

    constructor() {
        this.nodes = new Map();
    }

    public addNode(node: PackageNode): void {
        if (!this.nodes.has(node.id)) {
            this.nodes.set(node.id, node);
        }
    }

    public addEdge(fromId: string, toId: string, packageName: string, constraint: string, dependencyType: import('./types.js').DependencyType, isPeer?: boolean, isDev?: boolean): void {
        const fromNode = this.nodes.get(fromId);
        const toNode = this.nodes.get(toId);

        if (fromNode && toNode) {
            fromNode.dependencies.set(toId, { // Key is now targetId
                targetId: toId,
                packageName,
                constraint,
                isPeer,
                isDev,
                dependencyType
            });
            toNode.dependents.add(fromId);
        }
    }

    public getNode(id: string): PackageNode | undefined {
        return this.nodes.get(id);
    }

    public getDependents(id: string): string[] {
        const node = this.nodes.get(id);
        return node ? Array.from(node.dependents) : [];
    }

    public getDependencies(id: string): DependencyEdge[] {
        const node = this.nodes.get(id);
        return node ? Array.from(node.dependencies.values()) : [];
    }

    public getDependencyEdge(fromId: string, targetId: string): DependencyEdge | undefined {
        const fromNode = this.nodes.get(fromId);
        return fromNode ? fromNode.dependencies.get(targetId) : undefined;
    }

    public findPackages(name: string): PackageNode[] {
        const results: PackageNode[] = [];
        for (const node of this.nodes.values()) {
            if (node.name === name) {
                results.push(node);
            }
        }
        return results;
    }
    
    public getAllNodes(): PackageNode[] {
        return Array.from(this.nodes.values());
    }
}
